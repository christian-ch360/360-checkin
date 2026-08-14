import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function firstNameToken(fullName: string): string {
  return fullName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
}

/**
 * One-time resolution of the historical duplicate-email groups that are
 * unambiguous: exactly one APPROVED application in the group and every
 * applicant's first name matches (Case A in the duplicate-cleanup spec —
 * e.g. "Katrell Platt" Approved + "Katrell Platt" Pending). Mirrors
 * classifyGroup()/resolveDuplicateGroupAction() in
 * src/features/admin/services/duplicate-resolution.{service,actions}.ts
 * exactly, duplicated here (not imported) since this script runs outside
 * Next's bundler and can't resolve "@/..." path aliases — same convention
 * as prisma/backfill-referral-codes.ts.
 *
 * Deliberately does NOT touch Case B (multiple pending, no clear keeper) or
 * Case C (different names sharing an email) groups — those require a real
 * admin decision per the spec's own "do not automatically decide" rule, and
 * are left for the /admin/duplicate-emails resolution UI.
 *
 * Never deletes anything; only ever changes a non-APPROVED sibling's status
 * to DUPLICATE and stamps the duplicate* tracking fields. The APPROVED
 * application in each group is never modified. Dry-run by default — pass
 * --apply to write. Run with:
 *   npx tsx prisma/backfill-duplicate-applications.ts [--apply]
 *
 * Already run once against production data on 2026-08-14 — resolved the 3
 * Case A groups (sheisdreamz@gmail.com, ihakarov@gmail.com,
 * beatsbytrell2@gmail.com). Re-running is safe and a no-op unless a new
 * historical Case A group somehow appears (it shouldn't, now that email
 * uniqueness is enforced going forward).
 */
async function main() {
  console.log(APPLY ? "Running in APPLY mode — resolutions will be written." : "Running in DRY-RUN mode — pass --apply to write.");

  const applications = await prisma.membershipApplication.findMany({
    where: { status: { not: "DUPLICATE" } },
    select: { id: true, organizationId: true, fullName: true, email: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, typeof applications>();
  for (const app of applications) {
    const key = `${app.organizationId}:${normalizeEmail(app.email)}`;
    const existing = groups.get(key);
    if (existing) existing.push(app);
    else groups.set(key, [app]);
  }

  let resolvedGroups = 0;
  let resolvedApplications = 0;

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const approved = group.filter((a) => a.status === "APPROVED");
    const sameFirstName = new Set(group.map((a) => firstNameToken(a.fullName))).size <= 1;
    if (!sameFirstName || approved.length !== 1) continue; // not Case A — leave for manual review

    const keep = approved[0];
    const toMark = group.filter((a) => a.id !== keep.id);

    console.log(`\n${keep.email} — keeping "${keep.fullName}" (${keep.id}, APPROVED)`);
    for (const app of toMark) {
      console.log(`  -> marking "${app.fullName}" (${app.id}, ${app.status}) as DUPLICATE`);
    }

    if (APPLY) {
      const now = new Date();
      const note = "Auto-resolved by one-time backfill script: matching applicant name, approved application kept as canonical.";
      await prisma.$transaction([
        ...toMark.map((app) =>
          prisma.membershipApplication.update({
            where: { id: app.id },
            data: {
              status: "DUPLICATE",
              duplicateOfApplicationId: keep.id,
              duplicateResolvedAt: now,
              duplicateResolvedByMemberId: null,
              duplicateResolutionNote: note,
            },
          })
        ),
        prisma.auditLog.create({
          data: {
            organizationId: keep.organizationId,
            actorId: null,
            action: "application.marked_duplicate",
            entityType: "membership_application",
            entityId: keep.id,
            after: { keptApplicationId: keep.id, markedDuplicateIds: toMark.map((a) => a.id), note, source: "backfill-script" },
          },
        }),
      ]);
    }

    resolvedGroups += 1;
    resolvedApplications += toMark.length;
  }

  console.log(`\n${APPLY ? "Resolved" : "Would resolve"} ${resolvedGroups} group(s), ${resolvedApplications} application(s) marked DUPLICATE.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
