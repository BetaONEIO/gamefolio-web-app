const MAX_OAUTH_DIAGNOSTIC_LENGTH = 1_000;

const SECRET_FIELD_PATTERN =
  /\b(client_secret|code|access_token|refresh_token|id_token)\b\s*[:=]\s*([^\s&,;]+)/gi;

function safeString(value: unknown): string | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  return String(value)
    .replace(SECRET_FIELD_PATTERN, '$1=[Filtered]')
    .slice(0, MAX_OAUTH_DIAGNOSTIC_LENGTH);
}

export interface OAuthErrorDiagnostics {
  error?: string;
  errorDescription?: string;
  errorCodes?: string;
  timestamp?: string;
  traceId?: string;
  correlationId?: string;
}

/**
 * Extract only Microsoft's documented OAuth error metadata. The raw response is
 * deliberately never returned because it could contain credentials or tokens.
 */
export function parseOAuthErrorDiagnostics(responseBody: string): OAuthErrorDiagnostics {
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseBody);
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const body = parsed as Record<string, unknown>;
  const errorCodes = Array.isArray(body.error_codes)
    ? body.error_codes.map(safeString).filter(Boolean).join(',')
    : safeString(body.error_codes);

  return {
    error: safeString(body.error),
    errorDescription: safeString(body.error_description),
    errorCodes: errorCodes || undefined,
    timestamp: safeString(body.timestamp),
    traceId: safeString(body.trace_id),
    correlationId: safeString(body.correlation_id),
  };
}
