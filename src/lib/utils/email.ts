/**
 * Canonical form for comparing/storing an email address — case and
 * surrounding whitespace are never significant for "is this the same
 * account," so every write and lookup goes through this first.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
