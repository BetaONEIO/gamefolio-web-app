type SubmissionLike = {
  id?: unknown;
  slot_index?: unknown;
  status?: unknown;
};

const submittedStatuses = new Set(["pending", "under_review", "approved"]);

export function summarizeCampaignSubmissionSlots(
  submissions: unknown,
  quantity: number,
) {
  const latestBySlot = new Map<number, SubmissionLike>();
  const rows = Array.isArray(submissions) ? submissions as SubmissionLike[] : [];

  for (const [index, submission] of rows.entries()) {
    const slotIndex = Number(submission?.slot_index ?? index);
    if (!Number.isInteger(slotIndex) || slotIndex < 0) continue;
    const existing = latestBySlot.get(slotIndex);
    if (!existing || Number(submission.id) > Number(existing.id)) {
      latestBySlot.set(slotIndex, submission);
    }
  }

  const currentStatuses = [...latestBySlot.values()]
    .map(submission => String(submission.status ?? "").toLowerCase());
  const count = (statuses: string[]) => currentStatuses.filter(status => statuses.includes(status)).length;
  const required = Math.max(0, Math.floor(Number(quantity) || 0));
  const approved = Math.min(count(["approved"]), required);
  const submitted = Math.min(count(["pending", "under_review", "approved"]), required);
  const staged = Math.min(count(["staged"]), required);
  const submissionStatus = approved >= required && required > 0 ? "approved"
    : currentStatuses.includes("changes_requested") ? "changes_requested"
    : currentStatuses.includes("rejected") ? "rejected"
    : currentStatuses.includes("under_review") ? "under_review"
    : currentStatuses.includes("pending") ? "submitted"
    : staged > 0 ? "staged"
    : "not_started";

  return {
    approved,
    submitted,
    staged,
    pending: count(["pending"]),
    underReview: count(["under_review"]),
    changesRequested: count(["changes_requested"]),
    rejected: count(["rejected"]),
    submissionStatus,
  } as const;
}