import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeOAuthSession } from '../client/src/lib/oauth-session';
import { getQueryFn } from '../client/src/lib/queryClient';

test('OAuth session finalization cancels stale auth reads before publishing the verified user', async () => {
  const calls: string[] = [];
  let cachedUser: unknown;
  const queryClient = {
    cancelQueries: async () => { calls.push('cancel'); },
    setQueryData: (_key: unknown, user: unknown) => { calls.push('publish'); cachedUser = user; },
  };

  const verified = await finalizeOAuthSession(queryClient as any, { id: 103 }, async () => {
    calls.push('verify');
    return { id: 103, username: 'busyguy' };
  });

  assert.deepEqual(calls, ['cancel', 'verify', 'publish']);
  assert.equal(cachedUser, verified);
});

test('OAuth session finalization rejects a missing or mismatched session without publishing it', async () => {
  for (const sessionUser of [null, { id: 999 }]) {
    let published = false;
    const queryClient = {
      cancelQueries: async () => {},
      setQueryData: () => { published = true; },
    };

    await assert.rejects(
      finalizeOAuthSession(queryClient as any, { id: 103 }, async () => sessionUser as any),
      /session could not be verified/,
    );
    assert.equal(published, false);
  }
});

test('query cancellation reaches the underlying request abort signal', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(init?.signal, controller.signal);
      return new Response(JSON.stringify({ id: 103 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const query = getQueryFn<{ id: number }>({ on401: 'throw' });
    const user = await query({ queryKey: ['/api/user'], signal: controller.signal } as any);
    assert.deepEqual(user, { id: 103 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
