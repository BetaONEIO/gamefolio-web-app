import crypto from 'node:crypto';

/**
 * Game keys are bearer credentials.  They must never be written in plaintext
 * by new code, and this module deliberately exposes plaintext only to the
 * authorised reveal handler.
 */
export const ACTIVE_CAMPAIGN_KEY_VERSION = 'campaign-v1';
export const LEGACY_WALLET_KEY_VERSION = 'wallet-v1';

export function configuredActiveCampaignKeyVersion(): string {
  const explicitVersion = process.env.CAMPAIGN_KEY_ENCRYPTION_KEY_VERSION ||
    process.env.CAMPAIGN_KEY_ACTIVE_VERSION;
  if (!explicitVersion && !process.env.CAMPAIGN_KEY_ENCRYPTION_KEY && process.env.WALLET_ENCRYPTION_KEY) {
    return LEGACY_WALLET_KEY_VERSION;
  }
  const version = explicitVersion || ACTIVE_CAMPAIGN_KEY_VERSION;
  if (!/^campaign-v[0-9]+$/.test(version) && version !== LEGACY_WALLET_KEY_VERSION) {
    throw new Error(`Invalid active campaign key version ${version}; expected campaign-vN`);
  }
  return version;
}

function secretForVersion(version: string, allowLegacy: boolean): string {
  if (/^campaign-v[0-9]+$/.test(version)) {
    const suffix = version.slice('campaign-v'.length);
    const versioned = process.env[`CAMPAIGN_KEY_ENCRYPTION_KEY_V${suffix}`];
    if (versioned) return versioned;
    // CAMPAIGN_KEY_ENCRYPTION_KEY is intentionally a campaign-v1 compatibility
    // alias only; it must never silently decrypt an arbitrary active version.
    if (version === ACTIVE_CAMPAIGN_KEY_VERSION && process.env.CAMPAIGN_KEY_ENCRYPTION_KEY) {
      return process.env.CAMPAIGN_KEY_ENCRYPTION_KEY;
    }
    throw new Error(`Campaign key version ${version} is unavailable; configure CAMPAIGN_KEY_ENCRYPTION_KEY_V${suffix}`);
  }
  if (version === LEGACY_WALLET_KEY_VERSION && allowLegacy && process.env.WALLET_ENCRYPTION_KEY) {
    return process.env.WALLET_ENCRYPTION_KEY;
  }
  throw new Error(`Campaign key version ${version} is unavailable; run the explicit key backfill`);
}

function encryptionKey(version: string, allowLegacy = false): Buffer {
  const configured = secretForVersion(version, allowLegacy);
  return crypto.createHash('sha256').update(configured, 'utf8').digest();
}

export function hashCampaignKey(value: string): string {
  return crypto.createHash('sha256').update(value.trim(), 'utf8').digest('hex');
}

export function encryptCampaignKey(value: string, requestedVersion?: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
  hash: string;
  keyVersion: string;
  keyringId: string;
} {
  const iv = crypto.randomBytes(12);
  const keyVersion = requestedVersion || configuredActiveCampaignKeyVersion();
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    encryptionKey(keyVersion, keyVersion === LEGACY_WALLET_KEY_VERSION),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
    hash: hashCampaignKey(value),
    keyVersion,
    keyringId: keyVersion === LEGACY_WALLET_KEY_VERSION ? 'wallet' : 'campaign',
  };
}

export function decryptCampaignKey(row: {
  key_ciphertext?: string | null;
  key_iv?: string | null;
  key_auth_tag?: string | null;
  key_version?: string | null;
  keyring_id?: string | null;
  key_value?: string | null;
}): string {
  if (row.key_ciphertext && row.key_iv && row.key_auth_tag) {
    const version = row.key_version ||
      (process.env.CAMPAIGN_KEY_ENCRYPTION_KEY ? ACTIVE_CAMPAIGN_KEY_VERSION : LEGACY_WALLET_KEY_VERSION);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(version, version === LEGACY_WALLET_KEY_VERSION),
      Buffer.from(row.key_iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(row.key_auth_tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(row.key_ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
  // Legacy plaintext is intentionally not a reveal fallback. Boot-time
  // migration must encrypt it first; without a stable secret fail closed.
  throw new Error('Campaign key is unavailable');
}

export function redactKeyError(error: unknown): Error {
  // Do not include driver values or key material in operational errors.
  return new Error(error instanceof Error ? 'Campaign key operation failed' : 'Campaign key operation failed');
}