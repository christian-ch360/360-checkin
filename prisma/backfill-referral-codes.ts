import "dotenv/config";
import { PrismaClient, type MemberRole } from "@prisma/client";

const prisma = new PrismaClient();

// Mirrors REFERRAL_CODE_PREFIX in src/features/referrals/config/referral-config.ts
// — duplicated rather than imported since this script runs outside Next's
// bundler entirely (same convention as prisma/create-founder.ts).
const REFERRAL_CODE_PREFIX: Record<MemberRole, string> = {
  BRAND: "BRD",
  AGENCY: "AGY",
  BROKER: "BRK",
  BUSINESS_DEVELOPMENT: "BDV",
  CREATOR: "CRT",
  PROJECT_LEADER: "PRL",
  VENDOR: "VND",
  STAFF: "STF",
  ENTERTAINMENT: "ENT",
  INVESTOR: "INV",
};

const PAD_LENGTH = 6;
const APPLY = process.argv.includes("--apply");

/**
 * One-time backfill: "if auto-generating codes for existing members, codes
 * must be unique, must not overwrite existing referral-related data,
 * migration must be safe and reversible." Only ever touches members whose
 * referralCode is currently null — never overwrites an existing code, and
 * setting a referralCode back to null (undoing this script) is always safe
 * since no other row depends on it existing. Dry-run by default; pass
 * --apply to actually write. Run with: npx tsx prisma/backfill-referral-codes.ts [--apply]
 */
async function main() {
  console.log(APPLY ? "Running in APPLY mode — codes will be written." : "Running in DRY-RUN mode — pass --apply to write.");

  let totalAssigned = 0;

  for (const [role, prefix] of Object.entries(REFERRAL_CODE_PREFIX) as [MemberRole, string][]) {
    const members = await prisma.member.findMany({
      where: { role, referralCode: null, deletedAt: null },
      select: { id: true, fullName: true, email: true },
      orderBy: { createdAt: "asc" },
    });
    if (members.length === 0) continue;

    let count = await prisma.member.count({ where: { referralCode: { startsWith: `${prefix}-` } } });

    console.log(`\n${role} (${prefix}-): ${members.length} member(s) missing a referral code`);
    for (const member of members) {
      count += 1;
      const code = `${prefix}-${String(count).padStart(PAD_LENGTH, "0")}`;
      console.log(`  ${member.fullName} <${member.email}> -> ${code}`);
      if (APPLY) {
        await prisma.member.update({ where: { id: member.id }, data: { referralCode: code } });
      }
      totalAssigned += 1;
    }
  }

  console.log(`\n${APPLY ? "Assigned" : "Would assign"} ${totalAssigned} referral code(s) total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
