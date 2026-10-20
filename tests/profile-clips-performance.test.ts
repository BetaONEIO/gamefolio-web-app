import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { getTableColumns } from 'drizzle-orm';
import { clips } from '../shared/schema';
import { loadProfileClips } from '../server/profile-clips';
// Real Drizzle SQL generation and row mapping, deterministic database transport.
function fixture(size: number) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const queryDb = drizzle(async (sql, params) => {
    queries.push({ sql, params });
    if (sql.includes('left join')) {
      assert.match(sql, /where "clips"\."user_id" = \$1/); assert.equal(params[0], 42);
      assert.match(sql, /order by "clips"\."created_at" desc, "clips"\."id" desc/);
      const limit = sql.includes('limit') ? Number(params[1]) : size;
      const offset = sql.includes('offset') ? Number(params[2]) : 0;
      return { rows: Array.from({ length: size }, (_,i) => size-i).slice(offset, offset+limit).map(id => [
        ...Object.keys(getTableColumns(clips)).map(key => key === 'id' ? id : key === 'userId' ? 42 : null),
        42, 'fixture-user', 'Fixture User', null, true, null, null, null, null, null, null, null, null ]) };
    }
    assert.match(sql, /group by/); assert.ok(params.length > 0 && params.length <= 500);
    const count = sql.includes('from "likes"') ? '3' : sql.includes('from "comments"') ? '2' : '1';
    return { rows: params.filter(id => Number(id)%2 === 0).map(id => [id,count]) };
  });
  return { queryDb, queries };
}
test('192 clips use four queries and preserve order, relations and counts', async () => {
  const { queryDb, queries } = fixture(192); const result = await loadProfileClips(queryDb as any,42);
  assert.equal(queries.length,4); assert.equal(result.length,192);
  assert.deepEqual(result.map(c=>c.id),Array.from({length:192},(_,i)=>192-i));
  assert.deepEqual(result[0]._count,{likes:3,comments:2,reactions:1}); assert.deepEqual(result[1]._count,{likes:0,comments:0,reactions:0});
  assert.equal(result[0].user?.username,'fixture-user'); assert.equal(result[0].game,null);
});
test('large profiles are not truncated and aggregate batches stay bounded', async () => {
  const { queryDb, queries } = fixture(1001); const result = await loadProfileClips(queryDb as any,42);
  assert.equal(result.length,1001); assert.equal(result.at(-1)?.id,1); assert.equal(queries.length,10);
});
test('empty profiles and pagination boundaries', async () => {
  const empty=fixture(0); assert.deepEqual(await loadProfileClips(empty.queryDb as any,42),[]); assert.equal(empty.queries.length,1);
  const page=fixture(8); assert.deepEqual((await loadProfileClips(page.queryDb as any,42,{limit:3,offset:2})).map(c=>c.id),[6,5,4]);
});
