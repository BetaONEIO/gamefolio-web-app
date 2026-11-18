import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { createImpersonationAuthMiddleware } from "../server/middleware/impersonation-auth-core";

const admin = { id: 1, username: "mod_tom", role: "admin" };
const developer = { id: 2, username: "developer", role: "user" };
const payload = {
  type: "impersonation" as const,
  tokenId: "token-id",
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

function response() {
  const state: { status?: number; body?: unknown } = {};
  const res = {
    status(status: number) {
      state.status = status;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    },
  } as unknown as Response;
  return { res, state };
}

async function run(
  req: Request,
  verify = () => payload,
  load = async () => developer as any,
  isCandidate = () => true,
) {
  let nextCalls = 0;
  const { res, state } = response();
  const middleware = createImpersonationAuthMiddleware(verify as any, load as any, isCandidate);
  await middleware(req, res, (() => { nextCalls += 1; }) as NextFunction);
  return { nextCalls, response: state };
}

test("valid impersonation bearer identity overrides an existing admin session", async () => {
  const req = request("Bearer valid-impersonation-token");
  const result = await run(req);

  assert.equal(result.nextCalls, 1);
  assert.equal((req.user as any).id, developer.id);
  assert.deepEqual((req as any).impersonation, {
    tokenId: payload.tokenId,
    adminId: payload.adminId,
    adminUsername: payload.adminUsername,
  });
});

test("invalid impersonation token fails closed instead of preserving the admin session", async () => {
  const req = request("Bearer invalid-impersonation-token");
  const result = await run(req, () => { throw new Error("invalid"); });

  assert.equal(result.nextCalls, 0);
  assert.equal(result.response.status, 401);
  assert.equal(req.user, undefined);
  assert.equal((req as any).impersonation, undefined);
});

test("missing target user fails closed", async () => {
  const req = request("Bearer valid-but-stale-token");
  const result = await run(req, () => payload, async () => undefined as any);

  assert.equal(result.nextCalls, 0);
  assert.equal(result.response.status, 401);
  assert.equal(req.user, undefined);
  assert.equal((req as any).impersonation, undefined);
});

test("target lookup errors fail closed", async () => {
  const req = request("Bearer valid-token-during-database-error");
  const result = await run(req, () => payload, async () => {
    throw new Error("database unavailable");
  });

  assert.equal(result.nextCalls, 0);
  assert.equal(result.response.status, 401);
  assert.equal(req.user, undefined);
});

test("a target promoted after token issue cannot be impersonated", async () => {
  const req = request("Bearer valid-token-for-now-admin");
  const result = await run(req, () => payload, async () => ({ ...developer, role: "admin" }));

  assert.equal(result.nextCalls, 0);
  assert.equal(result.response.status, 403);
  assert.equal(req.user, undefined);
});

test("unrelated bearer tokens fall through to the native auth bridge", async () => {
  const req = request("Bearer native-access-token");
  const result = await run(
    req,
    () => { throw new Error("should not verify"); },
    async () => { throw new Error("should not load"); },
    () => false,
  );

  assert.equal(result.nextCalls, 1);
  assert.equal((req.user as any).id, admin.id);
});

test("requests without bearer auth leave the session untouched", async () => {
  const req = request();
  const result = await run(req, () => { throw new Error("should not verify"); });

  assert.equal(result.nextCalls, 1);
  assert.equal((req.user as any).id, admin.id);
});
