import "server-only";

import { prisma } from "@/lib/db/prisma";
import { normalizeEmail } from "@/lib/utils/email";

export type EmailConflictKind = "member" | "application_pending" | "application_approved" | "application_rejected";

export type EmailConflict = { kind: EmailConflictKind; memberId?: string; applicationId?: string };

/**
 * "One email address can only belong to one CreatorHub360 account" — the
 * single place every account-creating write path (Apply, Signup, Admin
 * Create Member) checks before it creates anything, so the query itself
 * only lives here. Member is checked first since it's the canonical
 * identity; a MembershipApplication only counts as a conflict when no
 * Member exists yet for that email (an approved application's email is
 * expected to also match its resulting Member — that's not a conflict,
 * it's the normal approval flow, and gets reported as "member" here).
 * Case-insensitive by construction (see normalizeEmail) so "Jane@x.com" and
 * "jane@x.com" are always treated as the same address.
 */
export async function findEmailConflict(
  organizationId: string,
  email: string,
  options: { excludeMemberId?: string; excludeApplicationId?: string } = {}
): Promise<EmailConflict | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const member = await prisma.member.findFirst({
    where: {
      organizationId,
      email: { equals: normalized, mode: "insensitive" },
      deletedAt: null,
      ...(options.excludeMemberId ? { id: { not: options.excludeMemberId } } : {}),
    },
    select: { id: true },
  });
  if (member) return { kind: "member", memberId: member.id };

  const application = await prisma.membershipApplication.findFirst({
    where: {
      organizationId,
      email: { equals: normalized, mode: "insensitive" },
      ...(options.excludeApplicationId ? { id: { not: options.excludeApplicationId } } : {}),
    },
    select: { id: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  if (!application) return null;

  const kind: EmailConflictKind =
    application.status === "PENDING"
      ? "application_pending"
      : application.status === "APPROVED"
        ? "application_approved"
        : "application_rejected";
  return { kind, applicationId: application.id };
}

/**
 * The account-creation gateway's message (Signup) — deliberately generic:
 * "Do not expose whether the email belongs to an approved member, pending
 * application, or rejected application." Every EmailConflictKind maps here.
 */
export const GENERIC_EMAIL_TAKEN_MESSAGE =
  "This email address is already registered with CreatorHub360. Please sign in or use a different email address.";

/**
 * The public Apply flow's three status-specific messages — richer feedback
 * than the generic one above is appropriate here, since telling a pending
 * or rejected applicant exactly what happened helps them without being a
 * meaningful privacy risk (they already know they applied).
 */
export function applicationConflictMessage(conflict: EmailConflict): string {
  switch (conflict.kind) {
    case "application_pending":
      return "You already have an application in progress.";
    case "application_rejected":
      return "This email has already been used to submit an application. Please contact CreatorHub360 if you believe this is an error.";
    case "member":
    case "application_approved":
      return "This email is already associated with an active CreatorHub360 member.";
  }
}

/**
 * Thrown by write paths that don't already return a structured
 * `{success,error}` result (submitApplication) — same shape as
 * AgencyDuplicateError (see agency-duplicate.service.ts) so the calling
 * server action can catch it distinctly and surface the exact message.
 */
export class EmailConflictError extends Error {
  conflict: EmailConflict;
  constructor(message: string, conflict: EmailConflict) {
    super(message);
    this.name = "EmailConflictError";
    this.conflict = conflict;
  }
}
