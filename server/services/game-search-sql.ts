import { eq, ilike, or, sql, type SQLWrapper } from 'drizzle-orm';
import { gameSearchNameKey, type GameSearchPlan } from './game-search';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Apply the same relevance tiers as gameSearchRank before LIMIT, so recent
// literal acronym matches cannot crowd the intended titles out of local search.
export function buildGameSearchSql(name: SQLWrapper, plan: GameSearchPlan) {
  const normalizedName = sql`lower(regexp_replace(btrim(${name}), ${'\\s+'}, ' ', 'g'))`;
  const preferred = plan.preferredTerms.map(gameSearchNameKey);
  const filter = or(...plan.terms.map((term) =>
    ilike(normalizedName, `%${escapeLike(gameSearchNameKey(term))}%`)
  )) ?? sql`false`;
  const exact = or(...preferred.map((term) => eq(normalizedName, term))) ?? sql`false`;
  const sequel = or(...preferred.map((term) =>
    sql`${normalizedName} ~ ${`^${escapeRegex(term)} ([0-9]+|[ivx]+)$`}`
  )) ?? sql`false`;
  const prefix = or(...preferred.map((term) =>
    sql`${normalizedName} ~ ${`^${escapeRegex(term)}($|[^[:alnum:]])`}`
  )) ?? sql`false`;
  const partial = or(...preferred.map((term) =>
    ilike(normalizedName, `%${escapeLike(term)}%`)
  )) ?? sql`false`;
  const rank = sql<number>`case
    when ${exact} then 0
    when ${sequel} then 1
    when ${prefix} then 2
    when ${partial} then 3
    when ${normalizedName} = ${gameSearchNameKey(plan.query)} then 4
    else 5 end`;
  return { filter, rank };
}
