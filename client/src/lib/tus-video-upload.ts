import * as tus from "tus-js-client";
import type { UploadErrorBody } from "@shared/bulk-upload-limits";
import { getAccessToken, getAccessTokenSync } from "@/lib/auth-token";
import { isAppActive } from "@/lib/mobile-init";
import { getUnpatchedXHR, isNative, resolveApiUrl } from "@/lib/platform";
import {
  parseFinishBody,
  parseFinishError,
  parseFinishHeader,
  shouldRetryTusStatus,
  type TusFinishResult,
} from "@/lib/tus-finish-payload";

// Same chunk size as the single-clip uploader. Each PATCH stays far under the
// edge proxy's request timeout, and a dropped chunk resumes from the last
// acknowledged offset instead of sending the whole file again.
export const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

// Long enough to ride out the app being backgrounded. Android suspends the
// WebView network stack, so every in-flight chunk dies at once. TUS resumes
// from the last acknowledged offset, so a longer budget does not re-send
// bytes that already landed.
const TUS_RETRY_DELAYS_MS = [0, 1000, 3000, 5000, 15000, 30000, 60000];

export class TusVideoUploadError extends Error {
  readonly httpStatus: number;
  readonly body: UploadErrorBody | null;

  constructor(message: string, httpStatus = 0, body: UploadErrorBody | null = null) {
    super(message);
    this.name = "TusVideoUploadError";
    this.httpStatus = httpStatus;
    this.body = body;
  }
}

function parseErrorBody(raw: string | null | undefined): UploadErrorBody | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UploadErrorBody;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

// tus-js-client's default browser stack uses the global XMLHttpRequest.
// CapacitorHttp patches that global and breaks large chunked PATCH uploads.
// This stack uses the unpatched constructor from a same-origin iframe, matching
// the single-clip uploader. Web keeps tus's own stack so same-origin session
// cookies are sent without a custom stack.
class NativeBypassHttpRequest implements tus.HttpRequest {
  private xhr: XMLHttpRequest;
  private headers: Record<string, string> = {};

  constructor(
    private method: string,
    private url: string,
  ) {
    this.xhr = new (getUnpatchedXHR())();
    this.xhr.open(method, url, true);
  }

  getMethod() {
    return this.method;
  }

  getURL() {
    return this.url;
  }

  setHeader(header: string, value: string) {
    this.xhr.setRequestHeader(header, value);
    this.headers[header] = value;
  }

  getHeader(header: string) {
    return this.headers[header];
  }

  setProgressHandler(progressHandler: (bytesSent: number) => void) {
    if (!("upload" in this.xhr)) return;
    this.xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      progressHandler(event.loaded);
    };
  }

  send(body?: XMLHttpRequestBodyInit): Promise<tus.HttpResponse> {
    return new Promise((resolve, reject) => {
      this.xhr.onload = () => resolve(new NativeBypassHttpResponse(this.xhr));
      this.xhr.onerror = (error) => reject(error);
      this.xhr.send(body);
    });
  }

  abort(): Promise<void> {
    this.xhr.abort();
    return Promise.resolve();
  }

  getUnderlyingObject() {
    return this.xhr;
  }
}

class NativeBypassHttpResponse implements tus.HttpResponse {
  constructor(private xhr: XMLHttpRequest) {}

  getStatus() {
    return this.xhr.status;
  }

  getHeader(header: string) {
    return this.xhr.getResponseHeader(header) ?? undefined;
  }

  getBody() {
    return this.xhr.responseText;
  }

  getUnderlyingObject() {
    return this.xhr;
  }
}

class NativeBypassHttpStack implements tus.HttpStack {
  createRequest(method: string, url: string) {
    return new NativeBypassHttpRequest(method, url);
  }

  getName() {
    return "NativeBypassHttpStack";
  }
}

function tusTransportOnline(): boolean {
  const backgrounded = isNative && !isAppActive();
  return backgrounded || typeof navigator === "undefined" || navigator.onLine !== false;
}

export function uploadVideoWithTus(options: {
  file: File;
  videoType: "clip" | "reel";
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
}): Promise<TusFinishResult> {
  return new Promise((resolve, reject) => {
    void (async () => {
      const token = (await getAccessToken()) ?? getAccessTokenSync();
      let finishResult: TusFinishResult | null = null;
      let serverBody: UploadErrorBody | null = null;
      let serverStatus = 0;

      const upload = new tus.Upload(options.file, {
        endpoint: resolveApiUrl("/api/upload/tus"),
        // Omit httpStack on web. Passing undefined crashes tus-js-client,
        // which calls options.httpStack.createRequest() with no null check.
        ...(isNative ? { httpStack: new NativeBypassHttpStack() } : {}),
        chunkSize: TUS_CHUNK_SIZE_BYTES,
        retryDelays: TUS_RETRY_DELAYS_MS,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        metadata: {
          filename: options.file.name,
          filetype: options.file.type || "video/mp4",
          uploadType: options.videoType === "reel" ? "reel" : "video",
        },
        onAfterResponse: (_req, res) => {
          const status = res.getStatus();
          serverStatus = status;
          const body = res.getBody();
          if (!finishResult) {
            finishResult = parseFinishBody(body) ?? parseFinishHeader(res.getHeader("Upload-Result"));
          }
          if (status >= 400) {
            serverBody = parseErrorBody(body) ?? serverBody;
          }
        },
        onShouldRetry: (error) => {
          const status = error.originalResponse ? error.originalResponse.getStatus() : 0;
          return shouldRetryTusStatus(status, error.originalResponse?.getBody(), tusTransportOnline());
        },
        onError: (error) => {
          const detailed = error as tus.DetailedError;
          const bodyText = detailed.originalResponse?.getBody();
          const status = detailed.originalResponse?.getStatus() ?? serverStatus;
          const finishError = parseFinishError(bodyText);
          const body = parseErrorBody(bodyText) ?? serverBody ?? (finishError
            ? { message: finishError.message, limits: finishError.limits }
            : null);
          const message = finishError?.message
            || (typeof body?.message === "string" && body.message)
            || (typeof body?.error === "string" && body.error)
            || (error instanceof Error ? error.message : "Upload to storage failed");
          reject(new TusVideoUploadError(message, status, body));
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          options.onProgress?.(bytesUploaded, bytesTotal);
        },
        onSuccess: (payload) => {
          const result = parseFinishBody(payload.lastResponse.getBody())
            ?? parseFinishHeader(payload.lastResponse.getHeader("Upload-Result"))
            ?? finishResult;
          if (!result) {
            reject(new TusVideoUploadError(
              "Upload finished but the server did not confirm it. Please try uploading again.",
              payload.lastResponse.getStatus(),
              serverBody,
            ));
            return;
          }
          resolve(result);
        },
      });

      upload.start();
    })().catch((error) => {
      reject(error instanceof Error ? error : new TusVideoUploadError("Upload to storage failed"));
    });
  });
}
