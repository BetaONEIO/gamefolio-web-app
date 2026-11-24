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

export const LOST_TUS_UPLOAD_MESSAGE =
  "The server lost this upload, so it is starting again from the beginning.";

const LOST_UPLOAD_TEXT = /the file for this url was not found/i;
const EXPIRED_UPLOAD_TEXT = /the file for this url no longer exists/i;

/**
 * A 404 with the tus datastore's missing-file text means the upload id is
 * gone (container restart). A 410 with the expiration text means the 24-hour
 * upload URL lapsed. Retrying that same URL fails again. `shouldRetryTusStatus`
 * stays false for both; the caller starts a new upload instead.
 */
export function isLostTusUpload(status: number, body: string | null | undefined): boolean {
  const text = body ?? "";
  if (status === 404 && LOST_UPLOAD_TEXT.test(text)) return true;
  if (status === 410 && EXPIRED_UPLOAD_TEXT.test(text)) return true;
  return false;
}

function messageLooksLikeLostTusUpload(message: string): boolean {
  return LOST_UPLOAD_TEXT.test(message) || EXPIRED_UPLOAD_TEXT.test(message);
}

export function errorLooksLikeLostTusUpload(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as {
    message?: unknown;
    httpStatus?: unknown;
    originalResponse?: { getStatus?: () => number; getBody?: () => string };
  };
  const status = typeof record.httpStatus === "number"
    ? record.httpStatus
    : record.originalResponse?.getStatus?.() ?? 0;
  const body = record.originalResponse?.getBody?.()
    ?? (typeof record.message === "string" ? record.message : "");
  if (isLostTusUpload(status, body)) return true;
  return status === 0 && typeof record.message === "string" && messageLooksLikeLostTusUpload(record.message);
}

/** The error a caller throws when the only recovery is a brand-new upload. */
export function lostTusUploadError(): Error {
  const body = "The file for this url was not found";
  return Object.assign(new Error(`tus: response code: 404, response text: ${body}`), {
    httpStatus: 404,
    originalResponse: {
      getStatus: () => 404,
      getBody: () => body,
    },
  });
}

/** `/api/upload/tus/<id>` → `/api/upload/tus/<id>/finish`, keeping the original origin. */
export function tusFinishUrl(uploadUrl: string): string | null {
  const match = uploadUrl.match(/^(.*\/api\/upload\/tus\/[a-z0-9]+)\/?$/i);
  if (!match) return null;
  return `${match[1]}/finish`;
}

export type TusFinishConfirmation =
  | { kind: "result"; result: TusFinishResult }
  | { kind: "lost" }
  | { kind: "error"; message: string };

/** Reads the follow-up finish call made when a completed tus HEAD has no payload. */
export function parseFinishConfirmation(status: number, body: string | null | undefined): TusFinishConfirmation {
  if (isLostTusUpload(status, body) || status === 404 || status === 410) return { kind: "lost" };
  if (status >= 200 && status < 300) {
    const result = parseFinishBody(body);
    if (result) return { kind: "result", result };
  }
  return {
    kind: "error",
    message: parseFinishError(body)?.message
      || "Upload finished but the server did not confirm it. Please try uploading again.",
  };
}

/**
 * The final PATCH can complete the multipart upload and then die before the
 * client sees `{ result }`. A later HEAD reports the full offset and
 * tus-js-client treats that as success. This asks the server to return the
 * saved result, or to finish the upload if that never happened.
 * `null` means the id is gone and the caller should start a new upload.
 */
export async function confirmUnfinishedTusUpload(
  uploadUrl: string,
  headers: Record<string, string>,
): Promise<TusFinishResult | null> {
  const finishUrl = tusFinishUrl(uploadUrl);
  if (!finishUrl) return null;
  const response = await fetch(finishUrl, {
    method: "POST",
    headers,
    credentials: "include",
  });
  const body = await response.text();
  const parsed = parseFinishConfirmation(response.status, body);
  if (parsed.kind === "lost") return null;
  if (parsed.kind === "error") throw new Error(parsed.message);
  return parsed.result;
}

/** Run an upload once more after the server reports the previous id is gone. */
export async function withLostUploadRestart<T>(
  run: () => Promise<T>,
  onRestart: () => void,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!errorLooksLikeLostTusUpload(error)) throw error;
    onRestart();
    return await run();
  }
}
