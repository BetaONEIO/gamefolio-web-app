import { sql } from "drizzle-orm";
import { db } from "../db";

export class CampaignUploadError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function validateCampaignUploadRow(
  record: {
    game_id: number | null;
    linked_game_id: number | null;
    status: string;
    deadline: Date | string | null;
    content_type: string;
    quantity: number;
    objective_snapshot?: unknown;
  } | undefined,
  contentType: "clip" | "reel" | "screenshot",
  objectiveId?: number,
): { gameId: number | null } {
  if (!record) throw new CampaignUploadError(403, "This campaign objective is unavailable for your account.");
  let snapshot = record.objective_snapshot;
  if (typeof snapshot === "string") {
    try { snapshot = JSON.parse(snapshot); } catch { throw new CampaignUploadError(409, "This campaign's objectives are not configured correctly."); }
  }
  const objectives = Array.isArray(snapshot) ? snapshot
    : snapshot && typeof snapshot === "object" && Array.isArray((snapshot as any).objectives)
      ? (snapshot as any).objectives : null;
  const objective = objectives && objectiveId != null
    ? objectives.find((item: any) => Number(item.id) === objectiveId) : null;
  if (objectives && objectiveId != null && !objective) {
    throw new CampaignUploadError(409, "This campaign objective is no longer available.");
  }
  const effectiveType = objective?.content_type ?? objective?.contentType ?? objective?.type ?? record.content_type;
  const effectiveQuantity = objective?.quantity ?? record.quantity;
  if (effectiveType !== contentType || Number(effectiveQuantity) <= 0) {
    throw new CampaignUploadError(409, "This objective does not accept that kind of upload.");
  }
  if (!["active", "in_progress", "changes_requested", "joined", "accepted", "access_reserved", "access_accepted"].includes(String(record.status))) {
    throw new CampaignUploadError(409, "This campaign is not accepting uploads right now.");
  }
  if (record.deadline && new Date(record.deadline).getTime() < Date.now()) {
    throw new CampaignUploadError(409, "The submission deadline has passed.");
  }
  const gameId = record.game_id == null ? null : Number(record.game_id);
  if (gameId !== null && (!Number.isSafeInteger(gameId) || gameId <= 0 || Number(record.linked_game_id) !== gameId)) {
    throw new CampaignUploadError(409, "This campaign's game is not configured correctly. Please contact the campaign owner.");
  }
  return { gameId };
}

// The campaign is authoritative: never accept a creator-supplied game ID for
// campaign media. Some Gamefolio-managed campaigns intentionally have no
// catalogue game and store unassigned media until it is staged to the campaign.
export async function resolveCampaignUploadContext(
  userId: number,
  instanceIdInput: unknown,
  objectiveIdInput: unknown,
  contentType: "clip" | "reel" | "screenshot",
): Promise<{ gameId: number | null }> {
  const instanceId = Number(instanceIdInput);
  const objectiveId = Number(objectiveIdInput);
  if (!Number.isSafeInteger(instanceId) || instanceId <= 0 || !Number.isSafeInteger(objectiveId) || objectiveId <= 0) {
    throw new CampaignUploadError(400, "This campaign upload is missing its objective. Open the campaign and try again.");
  }
  const result = await db.execute(sql`
    SELECT ci.game_id, ci.objective_snapshot, g.id AS linked_game_id, cp.status, cp.deadline, b.content_type, b.quantity
    FROM campaign_participants cp
    JOIN campaign_instances ci ON ci.id = cp.instance_id
    JOIN campaign_template_bounties b ON b.template_id = ci.template_id AND b.id = ${objectiveId}
    LEFT JOIN games g ON g.id = ci.game_id
    WHERE cp.instance_id = ${instanceId} AND cp.user_id = ${userId}
    LIMIT 1
  `);
  return validateCampaignUploadRow((((result as any).rows ?? result) as any[])[0], contentType, objectiveId);
}