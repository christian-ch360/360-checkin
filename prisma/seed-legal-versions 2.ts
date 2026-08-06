import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { LEGAL_DOCUMENTS } from "../src/features/legal/documents";

const prisma = new PrismaClient();

const INITIAL_VERSION = "1.0";

/**
 * One-time backfill: publishes v1.0 of every legal document (from the
 * static content this app shipped with) as the first LegalDocumentVersion
 * row per organization, so the admin dashboard and public /legal/* pages
 * have real DB-backed version history from day one instead of an empty
 * table. Idempotent via the (organizationId, documentType, version)
 * unique constraint — safe to re-run.
 */
async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true } });
  if (orgs.length === 0) {
    console.log("No organizations found — nothing to seed.");
    return;
  }

  for (const org of orgs) {
    console.log(`\nOrganization: ${org.name} (${org.id})`);

    for (const doc of Object.values(LEGAL_DOCUMENTS)) {
      const existing = await prisma.legalDocumentVersion.findUnique({
        where: {
          organizationId_documentType_version: {
            organizationId: org.id,
            documentType: doc.type,
            version: INITIAL_VERSION,
          },
        },
      });
      if (existing) {
        console.log(`  ${doc.type} v${INITIAL_VERSION} already exists — skipping`);
        continue;
      }

      await prisma.legalDocumentVersion.create({
        data: {
          organizationId: org.id,
          documentType: doc.type,
          version: INITIAL_VERSION,
          title: doc.title,
          summary: doc.summary,
          sections: doc.sections,
          status: "PUBLISHED",
          versionKind: null,
          changeSummary: "Initial publication.",
          effectiveDate: new Date(`${doc.effectiveDate}T00:00:00Z`),
          publishedAt: new Date(`${doc.effectiveDate}T00:00:00Z`),
        },
      });
      console.log(`  published ${doc.type} v${INITIAL_VERSION}`);
    }
  }

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("\nFailed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
