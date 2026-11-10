/** Regular bounties are the always-on discovery opportunities. */
export function isRegularBounty(campaign: any): boolean {
  let terms = campaign?.confirmed_terms;
  if (typeof terms === 'string') {
    try { terms = JSON.parse(terms); } catch { terms = null; }
  }
  return campaign?.included_discovery === true || terms?.model === 'discovery-v2';
}

/** Regular bounties with public access can start when the creator submits. */
export function canStartBountyOnSubmission(campaign: any): boolean {
  return isRegularBounty(campaign)
    && !campaign.manual_approval_required
    && campaign.requires_access_key !== true
    && ["free_to_play", "public_demo"].includes(campaign.access_method);
}

/** Size the submission history to include older bounties with multiple slots. */
export function nextBountySubmissionSlot(submissions: any[]): number {
  return submissions.reduce((next, submission, index) => {
    const slot = Number(submission.slot_index ?? index);
    return Number.isSafeInteger(slot) && slot >= 0 ? Math.max(next, slot + 1) : next;
  }, 0);
}
