import type { SystemRole } from "@prisma/client";

/**
 * The single source of truth for whether demo data should be shown. Every
 * call site imports this rather than re-deriving the condition. Re-checks
 * systemRole here (not just the stored boolean) so demo mode can never leak
 * to a non-Super-Admin even if the column were ever true on another row.
 */
export function isDemoModeActive(actor: { systemRole: SystemRole; demoModeEnabled: boolean }): boolean {
  return actor.systemRole === "SUPER_ADMIN" && actor.demoModeEnabled;
}
