/** Validation for manual profile edits; imported source data is kept separately. */
export function validateIndieProfilePatch(patch: Record<string, unknown>): string | null {
  if ('gameName' in patch && (typeof patch.gameName !== 'string' || !patch.gameName.trim() || patch.gameName.trim().length > 200)) return 'Game name must contain 1–200 characters.';
  if ('releaseStatus' in patch && !['coming_soon','early_access','released'].includes(String(patch.releaseStatus))) return 'Choose a valid release status.';
  if (patch.releaseDate != null && patch.releaseDate !== '') {
    const value=String(patch.releaseDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0,10)!==value) return 'Enter a valid release date.';
  }
  if (patch.price != null && patch.price !== '' && !/^(?:free|\d+(?:\.\d{1,2})?)$/i.test(String(patch.price).trim())) return 'Price must be a non-negative amount with up to two decimal places, or Free.';
  if (patch.studioFoundedYear != null && patch.studioFoundedYear !== '') {
    const value=String(patch.studioFoundedYear).trim();
    if (!/^\d{4}$/.test(value) || Number(value)<1800 || Number(value)>new Date().getFullYear()) return 'Enter a valid founded year, no later than this year.';
  }
  if (patch.studioTeamSize != null && patch.studioTeamSize !== '') {
    const value=String(patch.studioTeamSize).trim();
    const match=/^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(value);
    if (!match || Number(match[1])<1 || (match[2] && Number(match[2])<Number(match[1]))) return 'Team size must be a positive number or range, such as 3–5.';
  }
  for (const field of ['keyFeatures','genres','tags','platforms','supportedLanguages','contentDescriptors','screenshotUrls']) {
    const value=patch[field];
    if (value!=null && (!Array.isArray(value) || value.length>100 || value.some(item=>typeof item!=='string'||!item.trim()||item.length>2000))) return `${field} must be a list of non-empty text values.`;
  }
  for (const field of ['isFree','autoSyncEnabled']) if (field in patch && typeof patch[field]!=='boolean') return `${field} must be true or false.`;
  for (const field of ['studioWebsite','trailerUrl','headerImageUrl','capsuleImageUrl',...(Array.isArray(patch.screenshotUrls)?patch.screenshotUrls.map((_,index)=>`screenshot:${index}`):[])]) {
    const value=field.startsWith('screenshot:')?(patch.screenshotUrls as string[])[Number(field.split(':')[1])]:patch[field];
    if (value==null || value==='') continue;
    try {const url=new URL(String(value));if(!['https:','http:'].includes(url.protocol))throw Error();} catch {return `${field.startsWith('screenshot:')?'Screenshot URL':field} must be a valid HTTP or HTTPS URL.`;}
  }
  if (patch.steamAppId!=null && patch.steamAppId!=='' && !/^\d+$/.test(String(patch.steamAppId))) return 'Steam App ID must contain only digits.';
  return null;
}
