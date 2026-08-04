import "server-only";

import { randomBytes } from "crypto";

const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

// Not persisted anywhere, plaintext or hashed — generated, used once to
// create/update a Supabase auth user and populate the welcome email, then
// discarded when the caller returns.
export function generateTempPassword(length = 14): string {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) password += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  return password;
}
