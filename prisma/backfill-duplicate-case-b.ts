import "dotenv/config";
import Module from "node:module";
import { PrismaClient } from "@prisma/client";
import type { resolveDuplicateGroup as ResolveDuplicateGroupFn } from "@/features/admin/services/duplicate-resolution.actions";

// The feature-layer service/action files are marked "server-only" (Next's
// guard against a server module leaking into a client bundle) — that
// package throws unconditionally when required outside Next's own bundler,
// which is exactly what happens if this plain tsx script imports
// duplicate-resolution.actions.ts directly (it transitively pulls in
// requireCurrentMember -> "server-only", and audit-log.ts -> "server-only").
// Stubbed here, for this script's process only, so resolveDuplicateGroup —
// the same mutation the (since-removed) Duplicate Emails admin page used to
// call — can be reused as-is instead of reimplemented. Touches nothing on
// disk.
const nodeModule = Module as unknown as { _load: (request: string, parent: unknown, isMain: boolean) => unknown };
const originalLoad = nodeModule._load.bind(nodeModule);
nodeModule._load = (request: string, parent: unknown, isMain: boolean) => {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

// Must be a real (non-hoisted) require() so it runs strictly after the patch above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveDuplicateGroup } = require("@/features/admin/services/duplicate-resolution.actions") as {
  resolveDuplicateGroup: typeof ResolveDuplicateGroupFn;
};

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

/**
 * The 3 Case B groups this rule applies to — exactly two PENDING
 * applications sharing an email, same applicant name, no third-party
 * signal (like an APPROVED sibling) to break the tie. Restricted to this
 * explicit list rather than pattern-matching every current Case B group so
 * this script can never accidentally reach bigsiixstake@gmail.com (Case
 * C — different names, requires manual review) or any future ambiguous
 * group that happens to match the shape but wasn't reviewed for this rule.
 */
const TARGET_EMAILS = ["ashleystepteau1@gmail.com", "joshuamorales2000@icloud.com", "pdesio917@icloud.com"];

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeName(fullName: string): string {
  return fullName.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * One-time resolution of the 3 Case B (multiple pending, same name)
 * duplicate-email groups per the rule: "when there are exactly two pending
 * applications with the same normalized email and the same name, the most
 * recently submitted application is the legitimate one." Reuses
 * resolveDuplicateGroup — the same mutation/validation the (since-removed)
 * Duplicate Emails admin page used — rather than reimplementing the write
 * path (see src/features/admin/services/duplicate-resolution.actions.ts).
 *
 * Deliberately scoped to TARGET_EMAILS only — never touches
 * bigsiixstake@gmail.com (Case C, different names, needs manual review) or
 * the already-resolved Ahlam/Ibrahim Alkhatib/Katrell Platt groups.
 * `resolvedByMemberId` is null: this resolution was directed by the account
 * owner via chat, not performed by an authenticated admin session — same
 * convention as prisma/backfill-duplicate-applications.ts.
 *
 * Idempotent: only ever considers applications still in a non-DUPLICATE
 * status, so a second run finds no group with 2 active applications left
 * and changes nothing. Never deletes anything, never modifies the kept
 * (newer) application, never touches an already-resolved application. Dry-run
 * by default — pass --apply to write. Run with:
 *   npx tsx prisma/backfill-duplicate-case-b.ts [--apply]
 */
async function main() {
  console.log(APPLY ? "Running in APPLY mode — resolutions will be written." : "Running in DRY-RUN mode — pass --apply to write.");

  const applications = await prisma.membershipApplication.findMany({
    where: {
      status: { not: "DUPLICATE" },
      email: { in: TARGET_EMAILS, mode: "insensitive" },
    },
    select: { id: true, organizationId: true, fullName: true, email: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let resolvedGroups = 0;

  for (const targetEmail of TARGET_EMAILS) {
    const group = applications.filter((a) => normalizeEmail(a.email) === normalizeEmail(targetEmail));

    if (group.length < 2) {
      console.log(`\n${targetEmail} — already resolved (only ${group.length} active application left), skipping.`);
      continue;
    }
    if (group.length > 2) {
      console.log(`\n${targetEmail} — expected exactly 2 pending applications, found ${group.length}. Skipping — needs manual review.`);
      continue;
    }
    const [a, b] = group;
    if (normalizeName(a.fullName) !== normalizeName(b.fullName)) {
      console.log(`\n${targetEmail} — names don't match ("${a.fullName}" vs "${b.fullName}"). Skipping — this is Case C, not Case B.`);
      continue;
    }
    if (a.status !== "PENDING" || b.status !== "PENDING") {
      console.log(`\n${targetEmail} — expected both applications PENDING, found ${a.status}/${b.status}. Skipping — needs manual review.`);
      continue;
    }

    const [older, newer] = a.createdAt.getTime() <= b.createdAt.getTime() ? [a, b] : [b, a];

    console.log(`\n${targetEmail} — keeping "${newer.fullName}" (${newer.id}, submitted ${newer.createdAt.toISOString()})`);
    console.log(`  -> marking "${older.fullName}" (${older.id}, submitted ${older.createdAt.toISOString()}) as DUPLICATE`);

    if (APPLY) {
      const note =
        "Auto-resolved by one-time backfill script: two pending applications with the same name — the most recently submitted application was kept as the legitimate one, per the account owner's explicit resolution rule.";
      const result = await resolveDuplicateGroup(older.organizationId, null, newer.id, [older.id], note);
      if (!result.success) {
        console.error(`  FAILED: ${result.error}`);
        continue;
      }
    }
    resolvedGroups += 1;
  }

  console.log(`\n${APPLY ? "Resolved" : "Would resolve"} ${resolvedGroups} group(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
