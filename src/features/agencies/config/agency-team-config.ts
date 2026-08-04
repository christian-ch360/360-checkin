/** "Invitation emails should expire after a configurable number of days" — one place to change,
 * overridable per-environment without a code change. */
export const AGENCY_INVITATION_EXPIRY_DAYS = Number(process.env.AGENCY_INVITATION_EXPIRY_DAYS) || 7;
