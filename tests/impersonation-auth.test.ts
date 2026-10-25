import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { createImpersonationAuthMiddleware } from '../server/middleware/impersonation-auth-core';

const admin = { id: 1, username: 'mod_tom', role: 'admin' };
const developer = { id: 2, username: 'bounties_user_paid', role: 'user' };
const payload = {
  type: 'impersonation' as const,
  tokenId: 'token-id',
  adminId: admin.id,
  adminUsername: admin.username,
  targetUserId: developer.id,
};

function request(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
    user: admin,
  } as unknown as Request;
}

async function run(req: Request, verify = () => payload, load = async () => developer as any) {
  let nextCalls = 0;
  const middleware = createImpersonationAuthMiddleware(verify as any, load as any);
  await middleware(req, {} as Response, (() => { nextCalls += 1; }) as NextFunction);
  assert.equal(nextCalls, 1);
}

test('valid impersonation bearer identity overrides an existing admin session', async () => {
  const req = request('Bearer valid-impersonation-token');
  await run(req);

  assert.equal((req.user as any).id, developer.id);
  assert.deepEqual((req as any).impersonation, {
    tokenId: payload.tokenId,
    adminId: admin.id,
    adminUsername: admin.username,
  });
});

test('invalid bearer token preserves the existing session identity', async () => {
  const req = request('Bearer invalid-token');
  await run(req, () => { throw new Error('invalid'); });

  assert.equal((req.user as any).id, admin.id);
  assert.equal((req as any).impersonation, undefined);
});

test('missing target user preserves the existing session identity', async () => {
  const req = request('Bearer valid-but-stale-token');
  await run(req, () => payload, async () => undefined as any);

  assert.equal((req.user as any).id, admin.id);
  assert.equal((req as any).impersonation, undefined);
});

test('requests without bearer auth leave the session untouched', async () => {
  const req = request();
  await run(req, () => { throw new Error('should not verify'); });

  assert.equal((req.user as any).id, admin.id);
});
