import { Request } from 'express';
import { normalizedIp } from '../middleware/rate-limit';

const MAX_DEVICE_ID_LENGTH = 200;

/**
 * Client-supplied device identifier (see client/src/lib/device-id.ts — a UUID
 * persisted in localStorage / Capacitor Preferences and sent as X-Device-Id).
 * Older clients and third-party OAuth API callers won't send it, so this is a
 * best-effort signal, not a guarantee — treat absence as "unknown", not "same device".
 */
export function getDeviceId(req: Request): string | null {
  const header = req.headers['x-device-id'];
  const value = Array.isArray(header) ? header[0] : header;
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_DEVICE_ID_LENGTH);
}

export interface RequestMeta {
  ip: string;
  deviceId: string | null;
}

/** IP + device-id pair to stamp on signup/upload rows for spam & multi-account detection. */
export function getRequestMeta(req: Request): RequestMeta {
  return {
    ip: normalizedIp(req),
    deviceId: getDeviceId(req),
  };
}
