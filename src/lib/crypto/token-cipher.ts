import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// INTEGRATIONS_ENCRYPTION_KEY can be any length/format string — hashed down
// to a 32-byte AES-256 key so operators don't have to generate a
// precisely-sized secret themselves.
function getKey(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret) throw new Error("INTEGRATIONS_ENCRYPTION_KEY environment variable is not set");
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Format: <iv>.<authTag>.<ciphertext>, all hex. */
export function encryptToken(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${authTag.toString("hex")}.${ciphertext.toString("hex")}`;
}

export function decryptToken(cipherText: string): string {
  const [ivHex, authTagHex, dataHex] = cipherText.split(".");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Malformed encrypted token");

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
