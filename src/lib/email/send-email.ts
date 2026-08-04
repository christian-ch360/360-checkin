import "server-only";

import { getEmailClient, getEmailFrom } from "@/lib/email/resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult = { sent: boolean; reason?: string; providerId?: string; attempts: number };

const MAX_ATTEMPTS = 3;

async function sendEmailOnce(message: EmailMessage): Promise<{ sent: boolean; reason?: string; providerId?: string }> {
  const from = getEmailFrom();
  const logContext = { to: message.to, subject: message.subject, from };

  const resend = getEmailClient();
  if (!resend) {
    console.warn("[email] send skipped — RESEND_API_KEY not configured", logContext);
    return { sent: false, reason: "not_configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      console.error("[email] send failed", { ...logContext, providerResponse: error });
      return { sent: false, reason: error.message };
    }

    console.log("[email] sent", { ...logContext, providerId: data?.id });
    return { sent: true, providerId: data?.id };
  } catch (err) {
    console.error("[email] send threw", { ...logContext, error: err instanceof Error ? err.message : err });
    return { sent: false, reason: err instanceof Error ? err.message : "unknown_error" };
  }
}

/**
 * Best-effort transactional send with retry — a member approval/rejection,
 * a signup, or an invite must succeed in the database regardless of whether
 * the notification email actually went out. Never throws.
 *
 * Retries up to MAX_ATTEMPTS times, stopping early on success or when the
 * provider isn't configured at all (retrying won't help). Every email in
 * the app goes through this single primitive so retry behavior is uniform
 * — no more direct-send-once vs. queued-three-attempts split.
 */
export async function sendEmailWithRetry(message: EmailMessage): Promise<SendEmailResult> {
  let lastResult: { sent: boolean; reason?: string; providerId?: string } = { sent: false, reason: "unknown_error" };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    lastResult = await sendEmailOnce(message);

    if (lastResult.sent || lastResult.reason === "not_configured") {
      return { ...lastResult, attempts: attempt };
    }

    if (attempt < MAX_ATTEMPTS) {
      console.warn(`[email] attempt ${attempt}/${MAX_ATTEMPTS} failed for "${message.subject}" -> ${message.to}:`, lastResult.reason);
    }
  }

  console.error(`[email] gave up on "${message.subject}" -> ${message.to} after ${MAX_ATTEMPTS} attempts`);
  return { ...lastResult, attempts: MAX_ATTEMPTS };
}
