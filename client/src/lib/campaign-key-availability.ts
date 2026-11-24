type KeyCounts = { demo: number; full: number };

interface GameKeyInventory {
  gameId?: unknown;
  byType?: {
    demo?: { available?: unknown };
    full?: { available?: unknown };
  };
}

interface CampaignKeyReservation {
  game_id?: unknown;
  existing_reserved_demo_keys?: unknown;
  existing_reserved_full_keys?: unknown;
}

const knownCount = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

/** Inventory excludes allocated keys; only this campaign's reservations can be added back. */
export function getCampaignKeyAvailability(
  gameId: number | null,
  inventory: GameKeyInventory | null | undefined,
  draft?: CampaignKeyReservation | null,
): { available: Partial<KeyCounts>; reserved: KeyCounts | undefined } {
  const validGame = Number.isSafeInteger(gameId) && Number(gameId) > 0;
  const reserved = validGame && draft && Number(draft.game_id) === gameId
    ? {
        demo: knownCount(Number(draft.existing_reserved_demo_keys ?? 0)) ?? 0,
        full: knownCount(Number(draft.existing_reserved_full_keys ?? 0)) ?? 0,
      }
    : undefined;
  if (!validGame || Number(inventory?.gameId) !== gameId) return { available: {}, reserved };

  const demo = knownCount(inventory?.byType?.demo?.available);
  const full = knownCount(inventory?.byType?.full?.available);
  return {
    available: {
      demo: demo === undefined ? undefined : demo + (reserved?.demo ?? 0),
      full: full === undefined ? undefined : full + (reserved?.full ?? 0),
    },
    reserved,
  };
}
