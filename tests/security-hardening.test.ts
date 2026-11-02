import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const serverIndex = readFileSync(new URL('../server/index.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../server/routes.ts', import.meta.url), 'utf8');
const html = readFileSync(new URL('../client/index.html', import.meta.url), 'utf8');

test('production security headers and CORS use restrictive policies', () => {
  assert.match(serverIndex, /contentSecurityPolicy:\s*\{/);
  assert.match(serverIndex, /objectSrc:\s*\["'none'"\]/);
  assert.match(serverIndex, /frameAncestors:\s*\["'self'"\]/);
  assert.doesNotMatch(serverIndex, /Access-Control-Allow-Origin', '\*'/);
  assert.match(serverIndex, /https:\/\/app\.gamefolio\.com/);
  assert.doesNotMatch(html, /<script>\s/);
  assert.match(html, /src="\/security-bootstrap\.js"/);
});

test('authentication endpoints are rate limited and generic body limits are bounded', () => {
  for (const path of [
    '/api/login',
    '/api/register',
    '/api/2fa/verify',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/discord/token',
  ]) {
    assert.ok(serverIndex.includes(`'${path}'`), `${path} should be rate limited`);
  }
  assert.match(serverIndex, /express\.json\(\{ limit: '10mb' \}\)/);
  assert.match(serverIndex, /express\.urlencoded\(\{ extended: false, limit: '2mb' \}\)/);
  assert.doesNotMatch(serverIndex, /limit: '500mb'/);
});

test('blocked-user API does not disclose email fields', () => {
  const safeMapping = routes.match(/const safe = blocked\.map\(\(u\) => \(\{([\s\S]*?)\}\)\);/);
  assert.ok(safeMapping, 'blocked-user safe response mapping should exist');
  assert.doesNotMatch(safeMapping[1], /email/);
});
