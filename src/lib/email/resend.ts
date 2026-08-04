import "server-only";

import { Resend } from "resend";

let client: Resend | null | undefined;

/**
 * Returns null (not a throwing client) when RESEND_API_KEY isn't configured.
 * Callers must treat email as best-effort and continue the underlying
 * workflow (approving a member, etc.) regardless of whether a message could
 * actually be sent.
 */
export function getEmailClient(): Resend | null {
  if (client !== undefined) return client;
  const apiKey = process.env.RESEND_API_KEY;
  client = apiKey ? new Resend(apiKey) : null;
  return client;
}

/**
 * Every production email must come from CreatorHub360's own domain — never
 * the Resend sandbox sender (onboarding@resend.dev). If EMAIL_FROM isn't
 * configured, this falls back to an honestly-non-functional placeholder
 * address rather than a sandbox sender that would actually deliver mail
 * under the wrong brand.
 */
export function getEmailFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.warn("[email] EMAIL_FROM not configured — falling back to placeholder sender");
    return "CreatorHub360 <no-reply@creatorhub360.com>";
  }
  return from;
}
