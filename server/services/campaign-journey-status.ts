type CampaignJourneyInput = {
  participantStatus: string | null | undefined;
  deadline: Date | string | null | undefined;
  submittedUnits: number;
  totalUnits: number;
  hasAwaitingReview: boolean;
  hasChangesRequested: boolean;
  now?: number;
};

export function deriveCampaignJourneyStatus({
  participantStatus,
  deadline,
  submittedUnits,
  totalUnits,
  hasAwaitingReview,
  hasChangesRequested,
  now = Date.now(),
}: CampaignJourneyInput): "active" | "under_review" | "changes_requested" | "completed" | "expired" | "rejected" {
  const status = String(participantStatus ?? "");
  const deadlineTime = deadline ? new Date(deadline).getTime() : NaN;
  const protectedStatuses = ["completed", "completed_and_verified", "full_game_awarded", "submitted_for_review", "under_review", "rejected"];
  if (Number.isFinite(deadlineTime) && deadlineTime < now && !protectedStatuses.includes(status)) return "expired";
  if (status === "rejected") return "rejected";
  if (["completed", "completed_and_verified", "full_game_awarded"].includes(status)) return "completed";
  // Superseded changes-requested rows remain in the history after a replacement.
  // The participant's committed state wins over those historical rows.
  if (status === "submitted_for_review" || status === "under_review") return "under_review";
  if (status === "changes_requested" || hasChangesRequested) return "changes_requested";
  if (submittedUnits >= totalUnits && hasAwaitingReview) return "under_review";
  return "active";
}