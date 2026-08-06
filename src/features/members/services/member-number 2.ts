import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const PREFIX = "CH360";
const PAD_LENGTH = 6;

/**
 * Generates the next sequential member number (e.g. CH360-000001).
 * Retries on unique-constraint races instead of relying on a DB sequence,
 * since concurrent signups are rare relative to check-in/GMV write volume.
 */
export async function generateMemberNumber(): Promise<string> {
  const count = await prisma.member.count();
  return `${PREFIX}-${String(count + 1).padStart(PAD_LENGTH, "0")}`;
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}
