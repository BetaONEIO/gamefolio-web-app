/**
 * Cloudflare Stream Live provider.
 *
 * This is the ONLY module that talks to the streaming provider. The rest of the
 * app deals in our own `live_streams` rows. To swap to Mux/AWS IVS later, only
 * this file changes — keep the returned shape (LiveInput) stable.
 *
 * Required env (server-only, read on demand like Stripe/Firebase elsewhere):
 *   CLOUDFLARE_ACCOUNT_ID        — Cloudflare account ID
 *   CLOUDFLARE_STREAM_API_TOKEN  — API token with "Stream:Edit" permission
 *   CLOUDFLARE_STREAM_DOMAIN     — customer playback subdomain,
 *                                  e.g. "customer-abc123.cloudflarestream.com"
 * Optional:
 *   CLOUDFLARE_STREAM_WEBHOOK_SECRET — to verify live-input webhook signatures
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

export interface LiveInput {
  liveInputId: string;
  playbackId: string;
  ingestUrl: string;
  streamKey: string;
}

function cfConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const domain = process.env.CLOUDFLARE_STREAM_DOMAIN;
  if (!accountId || !apiToken || !domain) {
    throw new Error(
      "Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID, " +
        "CLOUDFLARE_STREAM_API_TOKEN and CLOUDFLARE_STREAM_DOMAIN.",
    );
  }
  return { accountId, apiToken, domain };
}

/** True when the provider env is present — used to short-circuit with a clear 503. */
export function isCloudflareStreamConfigured(): boolean {
  return Boolean(
    process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.CLOUDFLARE_STREAM_API_TOKEN &&
      process.env.CLOUDFLARE_STREAM_DOMAIN,
  );
}

async function cfFetch(path: string, init: RequestInit = {}) {
  const { accountId, apiToken } = cfConfig();
  const res = await fetch(`${API_BASE}/accounts/${accountId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    const detail =
      body?.errors?.map((e: any) => e.message).join("; ") || res.statusText;
    throw new Error(`Cloudflare Stream API error (${res.status}): ${detail}`);
  }
  return body.result;
}

function toLiveInput(result: any): LiveInput {
  return {
    liveInputId: result.uid,
    playbackId: result.uid, // CF uses the live input UID for playback manifests
    ingestUrl: result.rtmps?.url ?? "rtmps://live.cloudflare.com:443/live/",
    streamKey: result.rtmps?.streamKey ?? "",
  };
}

/** Create a new live input. `name` is shown in the Cloudflare dashboard only. */
export async function createLiveInput(name: string): Promise<LiveInput> {
  const result = await cfFetch(`/stream/live_inputs`, {
    method: "POST",
    body: JSON.stringify({
      meta: { name },
      recording: { mode: "automatic" }, // keep a VOD of each broadcast
    }),
  });
  return toLiveInput(result);
}

export async function deleteLiveInput(liveInputId: string): Promise<void> {
  await cfFetch(`/stream/live_inputs/${liveInputId}`, { method: "DELETE" });
}

/** HLS manifest URL for a playback id (works in <video> on Safari/iOS natively). */
export function hlsUrl(playbackId: string): string {
  const { domain } = cfConfig();
  return `https://${domain}/${playbackId}/manifest/video.m3u8`;
}

/** Iframe embed URL — the simplest cross-platform player (handles LL-HLS + adaptive). */
export function iframeUrl(playbackId: string): string {
  const { domain } = cfConfig();
  return `https://${domain}/${playbackId}/iframe`;
}
