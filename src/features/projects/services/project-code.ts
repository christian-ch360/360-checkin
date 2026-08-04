import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function generateProjectCode(): Promise<string> {
  const count = await prisma.project.count();
  return `PRJ-${String(count + 1).padStart(6, "0")}`;
}
