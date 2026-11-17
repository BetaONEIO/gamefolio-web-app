import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOAuthErrorDiagnostics } from '../server/oauth-diagnostics';

test('extracts Microsoft OAuth diagnostics without retaining unknown response fields', () => {
  const diagnostics = parseOAuthErrorDiagnostics(JSON.stringify({
    error: 'invalid_grant',
    error_description: 'AADSTS70000: The authorization code is invalid.',
    error_codes: [70000],
    timestamp: '2026-10-20 18:09:30Z',
    trace_id: 'trace-id',
    correlation_id: 'correlation-id',
    access_token: 'must-not-appear',
    arbitrary: 'must-not-appear',
  }));

  assert.deepEqual(diagnostics, {
    error: 'invalid_grant',
    errorDescription: 'AADSTS70000: The authorization code is invalid.',
    errorCodes: '70000',
    timestamp: '2026-10-20 18:09:30Z',
    traceId: 'trace-id',
    correlationId: 'correlation-id',
  });
  assert.equal(JSON.stringify(diagnostics).includes('must-not-appear'), false);
});

test('redacts secret-shaped values inside descriptions and ignores non-JSON bodies', () => {
  const diagnostics = parseOAuthErrorDiagnostics(JSON.stringify({
    error: 'invalid_client',
    error_description: 'client_secret=super-secret access_token: bearer-token',
  }));

  assert.equal(
    diagnostics.errorDescription,
    'client_secret=[Filtered] access_token=[Filtered]',
  );
  assert.deepEqual(parseOAuthErrorDiagnostics('<html>upstream failure</html>'), {});
});
