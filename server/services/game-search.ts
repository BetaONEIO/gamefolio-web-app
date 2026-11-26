export interface GameSearchPlan {
  query: string;
  providerQuery: string;
  preferredTerms: string[];
  terms: string[];
}

const ALIASES = [
  { acronym: 'gta', title: 'Grand Theft Auto', numeral: 'roman' },
  { acronym: 'rdr', title: 'Red Dead Redemption', numeral: 'arabic' },
  { acronym: 'cod', title: 'Call of Duty' },
  { acronym: 'nfs', title: 'Need for Speed' },
  { acronym: 'wow', title: 'World of Warcraft' },
  { acronym: 'lol', title: 'League of Legends' },
] as const;

const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function gameSearchNameKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  return terms.filter((term) => {
    const key = gameSearchNameKey(term);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Expand only known aliases at the beginning of a query, never arbitrary initials. */
export function createGameSearchPlan(input: string): GameSearchPlan {
  const query = input.trim().replace(/\s+/g, ' ');
  for (const alias of ALIASES) {
    // Attached sequels (GTAV, GTA5, RDR2) are allowed, but GTAfoo is not.
    const prefix = new RegExp(`^${alias.acronym}(?=$|[\\s:.-]|(?:[0-9]+|[ivx]+)(?:$|[\\s:.-]))`, 'i');
    const match = query.match(prefix);
    if (!match) continue;

    const suffix = query.slice(match[0].length).replace(/^[\s:.-]+/, '');
    let preferredTerms: string[];
    if (!suffix) {
      preferredTerms = [alias.title];
    } else {
      const sequel = suffix.match(/^([0-9]+|[ivx]+)(?=$|[\s:.-])/i);
      const sequelNumber = sequel
        ? (/^[0-9]+$/.test(sequel[1]) ? Number(sequel[1]) : ROMAN_NUMERALS.indexOf(sequel[1].toUpperCase()))
        : -1;
      if ('numeral' in alias && sequel && sequelNumber > 0 && sequelNumber < ROMAN_NUMERALS.length) {
        const rest = suffix.slice(sequel[0].length);
        const numbers = alias.numeral === 'roman'
          ? [ROMAN_NUMERALS[sequelNumber], String(sequelNumber)]
          : [String(sequelNumber), ROMAN_NUMERALS[sequelNumber]];
        preferredTerms = numbers.map((number) => `${alias.title} ${number}${rest}`);
      } else {
        // Titles vary between "Franchise Subtitle" and "Franchise: Subtitle".
        preferredTerms = [`${alias.title} ${suffix}`, `${alias.title}: ${suffix}`];
      }
    }

    preferredTerms = uniqueTerms(preferredTerms);
    return {
      query,
      providerQuery: preferredTerms[0],
      preferredTerms,
      terms: uniqueTerms([...preferredTerms, query]),
    };
  }

  const terms = query ? [query] : [];
  return { query, providerQuery: query, preferredTerms: terms, terms };
}

/** Keep the ranking tiers in sync with the SQL ordering before its result limit. */
export function gameSearchRank(name: string, plan: GameSearchPlan): number {
  const key = gameSearchNameKey(name);
  const preferred = plan.preferredTerms.map(gameSearchNameKey);
  if (preferred.includes(key)) return 0;
  if (preferred.some((term) => key.startsWith(`${term} `) && /^(?:[0-9]+|[ivx]+)$/.test(key.slice(term.length + 1)))) return 1;
  if (preferred.some((term) => key.startsWith(term) && /^[^\p{L}\p{N}]/u.test(key.slice(term.length)))) return 2;
  if (preferred.some((term) => key.includes(term))) return 3;
  return key === gameSearchNameKey(plan.query) ? 4 : 5;
}

export function rankGameSearchResults<T extends { name: string }>(results: T[], plan: GameSearchPlan): T[] {
  const seen = new Set<string>();
  return results
    .filter((game) => {
      const key = gameSearchNameKey(game.name);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((game, index) => ({ game, index, rank: gameSearchRank(game.name, plan) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ game }) => game);
}
