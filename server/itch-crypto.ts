import crypto from "crypto";

const PREFIX = "itch:v1";
const ALGORITHM = "aes-256-gcm";

function getItchEncryptionKey(): Buffer {
  const rootKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!rootKey || !/^[0-9a-f]{64}$/i.test(rootKey)) {
    throw new Error("WALLET_ENCRYPTION_KEY must be a 64-character hex string");
  }

  // Derive a distinct key so an itch.io credential is never encrypted with the
  // same AES key material as a custodial wallet private key.
  return crypto
    .createHash("sha256")
    .update(Buffer.from(rootKey, "hex"))
    .update("gamefolio:itch-api-key:v1")
    .digest();
}

export function encryptItchApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getItchEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return `${PREFIX}:${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptItchApiKey(value: string): { apiKey: string; isLegacyPlaintext: boolean } {
  if (!value.startsWith(`${PREFIX}:`)) {
    // Old connections were stored as plaintext. Callers re-encrypt them after
    // a successful read so existing developers do not need to reconnect.
    return { apiKey: value, isLegacyPlaintext: true };
  }

  const [, , ivHex, authTagHex, ciphertextHex] = value.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error("Invalid encrypted itch.io credential");

  const decipher = crypto.createDecipheriv(ALGORITHM, getItchEncryptionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const apiKey = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
  return { apiKey, isLegacyPlaintext: false };
}