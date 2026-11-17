import assert from "node:assert/strict";
import test from "node:test";
import { requiresCancellationPassword } from "../shared/subscription-cancellation.ts";

test("Discord and other social sign-ins can reach cancellation without a local password", () => {
  for (const provider of ["discord", "google", "apple", "steam", "xbox", "twitch"]) {
    assert.equal(requiresCancellationPassword(provider), false, provider);
  }
});

test("local and legacy password accounts retain their password verification", () => {
  for (const provider of ["local", null, undefined, ""]) {
    assert.equal(requiresCancellationPassword(provider), true);
  }
});
