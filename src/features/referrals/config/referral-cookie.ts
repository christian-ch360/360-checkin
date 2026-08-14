/** Shared between middleware.ts (sets it) and /apply/page.tsx (reads it as a
 * fallback when no ?ref=/?agency= query param is present on the page they
 * eventually land on to submit) — kept as one constant so the two stay in sync. */
export const REFERRAL_COOKIE_NAME = "ch360_referral_code";
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
