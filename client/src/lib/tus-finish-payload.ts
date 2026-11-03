// Reading the result of a TUS upload out of the server's responses.
//
// `tusOnUploadFinish` (server/routes/upload.ts) answers the final PATCH with
// `{ success: true, result }` as the body *and* the same `result` in an
// `Upload-Result` header (exposed cross-origin by server/index.ts). Either one
// is enough to finish the upload client-side.
//
// Both have to be optional at the call site, because the response tus-js-client
// hands to `onSuccess` is not always the response that ran the finish hook. If
// the final PATCH fails and gets retried, tus-js-client re-syncs with a HEAD
// first; when that HEAD reports offset === size it declares the upload complete
// and `lastResponse` is the *HEAD* — no body, no `Upload-Result`. Parsing it
// blind threw `SyntaxError: Unexpected end of JSON input` (Sentry
// GAMEFOLIO-MOBILE-1F) and failed uploads whose bytes had actually landed.

export interface TusFinishResult {
  url: string;
  path: string;
}

function toResult(candidate: unknown): TusFinishResult | null {
  const { url, path } = (candidate ?? {}) as Record<string, unknown>;
  if (typeof url !== 'string' || !url) return null;
  if (typeof path !== 'string' || !path) return null;
  return { url, path };
}

function parseJson(raw: string | null | undefined): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Reads the `{ success, result }` contract from a response body. */
export function parseFinishBody(body: string | null | undefined): TusFinishResult | null {
  const parsed = parseJson(body) as { success?: unknown; result?: unknown } | null;
  if (!parsed?.success) return null;
  return toResult(parsed.result);
}

/** Reads the bare `result` from the `Upload-Result` response header. */
export function parseFinishHeader(header: string | null | undefined): TusFinishResult | null {
  return toResult(parseJson(header));
}

/**
 * Pulls the human-readable reason out of an error response, so a failed upload
 * reports what the server actually said instead of a parser error. Mirrors the
 * `{ error, message, limits? }` envelope `tusOnUploadFinish` returns on failure.
 */
export function parseFinishError(
  body: string | null | undefined,
): { message: string; limits?: unknown } | null {
  const parsed = parseJson(body) as { message?: unknown; limits?: unknown } | null;
  if (typeof parsed?.message !== 'string' || !parsed.message) return null;
  return { message: parsed.message, limits: parsed.limits };
}

/**
 * Whether a failed tus request should be retried. 502/503/504 and dropped
 * connections are retried. A JSON `{ message }` envelope is our own
 * onUploadFinish rejection (tier limit, duration) and must not be retried —
 * retrying it re-sends an upload the server already finished and hides the
 * reason. 409/423 are tus protocol states that clear on their own.
 */
export function shouldRetryTusStatus(
  status: number,
  body: string | null | undefined,
  online = true,
): boolean {
  if (status === 409 || status === 423) return online;
  if (parseFinishError(body)) return false;
  if (status >= 400 && status < 500) return false;
  return online;
}
