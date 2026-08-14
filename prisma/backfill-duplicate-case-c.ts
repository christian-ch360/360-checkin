import "dotenv/config";
import Module from "node:module";
import { PrismaClient } from "@prisma/client";
import type { resolveDuplicateGroup as ResolveDuplicateGroupFn } from "@/features/admin/services/duplicate-resolution.actions";

// See prisma/backfill-duplicate-case-b.ts for why this stub is necessary —
// "server-only" throws unconditionally when required outside Next's own
// bundler, and duplicate-resolution.actions.ts transitively imports it.
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

const TARGET_EMAIL = "bigsiixstake@gmail.com";

/**
 * One-time, manually-reviewed resolution of the last remaining Case C
 * duplicate-email group. Unlike Case A/B (which classify automatically by
 * name-matching), this one required a human check: Abdul rana's email
 * matches an already-APPROVED application and an already-ACTIVE Member
 * (CH360-000086) — confirmed by the account owner — so his application is
 * the legitimate record. Rashel herrera's later PENDING application under
 * the same email is the duplicate. Reuses resolveDuplicateGroup — the same
 * mutation the (since-removed) Duplicate Emails admin page used — rather
 * than reimplementing the write path.
 *
 * Never touches the Member table (CH360-000086 stays exactly as-is), never
 * touches Abdul's approved application, never deletes anything. Idempotent:
 * only proceeds if both applications are still active (non-DUPLICATE) with
 * the expected statuses — a second run finds Rashel's application already
 * DUPLICATE and changes nothing. Dry-run by default — pass --apply to
 * write. Run with:
 *   npx tsx prisma/backfill-duplicate-case-c.ts [--apply]
 */
async function main() {
  console.log(APPLY ? "Running in APPLY mode — resolution will be written." : "Running in DRY-RUN mode — pass --apply to write.");

  const apps = await prisma.membershipApplication.findMany({
    where: { email: { equals: TARGET_EMAIL, mode: "insensitive" } },
    select: { id: true, organizationId: true, fullName: true, status: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const approved = apps.find((a) => a.status === "APPROVED");
  const pending = apps.find((a) => a.status === "PENDING");

  if (!approved) {
    console.log(`\n${TARGET_EMAIL} — no APPROVED application found. Nothing to do.`);
    return;
  }
  if (!pending) {
    console.log(`\n${TARGET_EMAIL} — no PENDING application left (already resolved, or nothing to resolve). Nothing to do.`);
    return;
  }

  console.log(`\n${TARGET_EMAIL} — keeping "${approved.fullName}" (${approved.id}, APPROVED — matches active member CH360-000086)`);
  console.log(`  -> marking "${pending.fullName}" (${pending.id}, PENDING) as DUPLICATE`);

  if (APPLY) {
    const note =
      "This email already belongs to an existing approved and active CreatorHub360 member (Abdul rana, CH360-000086). The newer pending application (Rashel herrera) is therefore a duplicate — resolved by the account owner after manual review, not an automatic name-match decision.";
    const result = await resolveDuplicateGroup(approved.organizationId, null, approved.id, [pending.id], note);
    if (!result.success) {
      console.error(`  FAILED: ${result.error}`);
      process.exitCode = 1;
      return;
    }
    console.log("\nResolved.");
  } else {
    console.log("\nWould resolve 1 group.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
