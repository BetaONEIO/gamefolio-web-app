export function creatorJourneyGuidance(input: {
  status: string; expired: boolean; accessRequired: boolean; ready: boolean;
  staged: boolean; remaining: number; nextObjective?: string;
}) {
  const {status}=input;
  if (['approved','completed','completed_and_verified','full_game_awarded'].includes(status)) return {title:'All required work approved',detail:'Your campaign work is complete. Check reward fulfilment below; season reward estimates are separate from paid balances.'};
  if (['under_review','submitted','submitted_for_review','pending_review'].includes(status)) return {title:'Awaiting developer review',detail:'Your submitted work is awaiting a decision. We’ll notify you when it is reviewed.'};
  if (status==='changes_requested') return {title:'Update the requested items',detail:'Read the reason on each affected item. Approved work stays preserved; check each replacement’s submission status.'};
  if (status==='rejected') return {title:'Review the rejection reason',detail:'Read the developer’s explanation on the affected work. If you disagree, report the issue for review.'};
  if (input.expired) return {title:'Your submission deadline has passed',detail:'Your saved work and submission history remain available. Report an issue if a technical problem prevented completion.'};
  if (input.accessRequired) return {title:'Get your game access',detail:'Reveal your reserved access below, then check that the game runs before starting your content.'};
  if (input.ready) return {title:input.staged?'Submit your work for approval':'Your required work is submitted',detail:input.staged?'Review your prepared items and select Submit for approval. Draft items are not yet submitted.':'Check approval status below. The developer reviews each submitted item against the campaign requirements.'};
  return {title:input.nextObjective?`Next: ${input.nextObjective}`:'Complete your remaining objectives',detail:`${input.remaining} required item${input.remaining===1?'':'s'} remaining. Follow the brief and check each item’s status after saving it.`};
}
