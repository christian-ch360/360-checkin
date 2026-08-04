import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const isDev = process.env.NODE_ENV === "development";

// Query-level logging is dev-only by construction: the "query" log level is
// only ever requested when isDev is true, so a production build (NODE_ENV
// !== "development") never emits per-query events or their event listener
// below, regardless of this module being reused across requests.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev
      ? [
          { emit: "event", level: "query" },
          { emit: "stdout", level: "error" },
          { emit: "stdout", level: "warn" },
        ]
      : ["error"],
  });

if (isDev) {
  const SLOW_QUERY_MS = 50;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma as any).$on("query", (e: { query: string; params: string; duration: number }) => {
    const flag = e.duration >= SLOW_QUERY_MS ? " ⚠ SLOW" : "";
    console.log(`[prisma] ${e.duration}ms${flag}  ${e.query}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
