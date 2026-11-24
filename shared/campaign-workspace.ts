export const WORKSPACE_EDIT_FIELDS = ['campaignTitle', 'guidance', 'faq', 'links', 'contact'] as const;
// Never accept terms, capacity, deadlines or key allocations through a metadata save.
export function validateWorkspaceChanges(body: Record<string, unknown>) {
  const changes: Record<string, string> = {};
  const limits: Record<string, number> = { campaignTitle: 120, guidance: 4000, faq: 4000, links: 4000, contact: 500 };
  for (const [key, value] of Object.entries(body)) {
    if (!(WORKSPACE_EDIT_FIELDS as readonly string[]).includes(key)) throw new Error(`${key} is locked after confirmation`);
    if (typeof value !== 'string' || value.length > limits[key]) throw new Error(`Enter valid ${key} text (maximum ${limits[key]} characters)`);
    if (key === 'campaignTitle' && !value.trim()) throw new Error('Campaign title is required');
    if (key === 'links' && value.trim()) for (const link of value.split(/\r?\n/).filter(Boolean)) {
      let url: URL; try { url = new URL(link.trim()); } catch { throw new Error('Use one full HTTPS link per line'); }
      if (url.protocol !== 'https:') throw new Error('Useful links must use HTTPS');
    }
    changes[key] = value.trim();
  }
  if (!Object.keys(changes).length) throw new Error('No changes to save');
  return changes;
}
