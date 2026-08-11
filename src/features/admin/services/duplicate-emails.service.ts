import "server-only";

import type { MembershipApplicationStatus, MemberStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { normalizeEmail } from "@/lib/utils/email";

export type DuplicateApplicationGroup = {
  email: string;
  applications: { id: string; fullName: string; status: MembershipApplicationStatus; createdAt: Date }[];
};

export type ApplicationMemberConflict = {
  email: string;
  application: { id: string; fullName: string; status: MembershipApplicationStatus; createdAt: Date };
  member: { id: string; fullName: string; status: MemberStatus };
};

export type DuplicateEmailReport = {
  applicationDuplicateGroups: DuplicateApplicationGroup[];
  applicationMemberConflicts: ApplicationMemberConflict[];
};

/**
 * Existing-data audit for "one email address can only belong to one
 * CreatorHub360 account" — surfaces records that predate this rule being
 * enforced so an admin can review and resolve them by hand. Read-only:
 * never deletes, merges, or otherwise mutates anything (that's a deliberate
 * decision — automated merges could silently destroy data an admin needed
 * to see first). Two categories:
 *
 * 1. `applicationDuplicateGroups` — two or more MembershipApplication rows
 *    sharing an email. Always a real issue: MembershipApplication.email has
 *    no DB-level unique constraint (unlike Member.email) because retrofitting
 *    one would have silently failed given rows like these already exist, so
 *    this scan is the substitute enforcement for pre-existing data while
 *    findEmailConflict (see email-lookup.service.ts) blocks any new ones.
 * 2. `applicationMemberConflicts` — a non-APPROVED application whose email
 *    matches an existing Member. An APPROVED application matching its own
 *    resulting Member is the normal outcome of approveApplicationAction and
 *    is deliberately excluded — only PENDING/REJECTED matches are surfaced,
 *    since those mean the same email reached two different account records.
 */
export async function findDuplicateEmailGroups(organizationId: string): Promise<DuplicateEmailReport> {
  const [applications, members] = await Promise.all([
    prisma.membershipApplication.findMany({
      where: { organizationId },
      select: { id: true, fullName: true, email: true, status: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.member.findMany({
      where: { organizationId, deletedAt: null },
      select: { id: true, fullName: true, email: true, status: true },
    }),
  ]);

  const applicationsByEmail = new Map<string, typeof applications>();
  for (const application of applications) {
    const key = normalizeEmail(application.email);
    const list = applicationsByEmail.get(key);
    if (list) list.push(application);
    else applicationsByEmail.set(key, [application]);
  }

  const applicationDuplicateGroups: DuplicateApplicationGroup[] = [];
  for (const [email, apps] of applicationsByEmail) {
    if (apps.length < 2) continue;
    applicationDuplicateGroups.push({
      email,
      applications: apps.map((a) => ({ id: a.id, fullName: a.fullName, status: a.status, createdAt: a.createdAt })),
    });
  }
  applicationDuplicateGroups.sort((a, b) => b.applications.length - a.applications.length);

  const memberByEmail = new Map(members.map((m) => [normalizeEmail(m.email), m]));
  const applicationMemberConflicts: ApplicationMemberConflict[] = [];
  for (const [email, apps] of applicationsByEmail) {
    const member = memberByEmail.get(email);
    if (!member) continue;
    for (const application of apps) {
      if (application.status === "APPROVED") continue;
      applicationMemberConflicts.push({
        email,
        application: { id: application.id, fullName: application.fullName, status: application.status, createdAt: application.createdAt },
        member: { id: member.id, fullName: member.fullName, status: member.status },
      });
    }
  }

  if (applicationDuplicateGroups.length > 0 || applicationMemberConflicts.length > 0) {
    console.warn(
      `[duplicate-emails] organization ${organizationId}: ${applicationDuplicateGroups.length} duplicate application-email group(s), ${applicationMemberConflicts.length} application/member conflict(s) awaiting manual review`
    );
  }

  return { applicationDuplicateGroups, applicationMemberConflicts };
}
