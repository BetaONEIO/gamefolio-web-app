/** Presentation only: stored objective titles remain creator instructions. */
export type DisplayObjective = { type?: string; content_type?: string; quantity: number; title?: string };
const names: Record<string, [string, string]> = {
  clip: ['gameplay clip', 'gameplay clips'],
  reel: ['vertical gameplay reel', 'vertical gameplay reels'],
  screenshot: ['gameplay screenshot', 'gameplay screenshots'],
  feedback: ['creator feedback response', 'creator feedback responses'],
  review: ['creator review', 'creator reviews'],
  stream: ['verified livestream', 'verified livestreams'],
  play_session: ['verified play session', 'verified play sessions'],
  bug: ['bug report', 'bug reports'],
};
export function getDeveloperObjectiveLabel(objective: DisplayObjective, streamMinutes?: number): string {
  const type = objective.type ?? objective.content_type ?? '';
  const quantity = objective.quantity;
  if (type === 'feedback' && quantity === 1) return 'Creator feedback';
  const label = names[type]?.[quantity === 1 ? 0 : 1] ?? 'contribution';
  if (type === 'stream' && streamMinutes != null) return `${quantity} verified ${streamMinutes}-minute ${quantity === 1 ? 'livestream' : 'livestreams'}`;
  return `${quantity} ${label}`;
}
export function getDeveloperOutputLabel(type: string): string {
  const label = names[type]?.[1] ?? 'contributions';
  return label.charAt(0).toUpperCase() + label.slice(1);
}
/** Pass the existing stored instruction through without changing creator copy. */
export function getCreatorObjectiveInstruction(objective: DisplayObjective): string {
  return objective.title ?? '';
}
