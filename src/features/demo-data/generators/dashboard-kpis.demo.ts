import "server-only";

import { getDemoUniverse } from "@/features/demo-data/seed/universe";

export function demoGetAdminKpis() {
  return getDemoUniverse().adminKpis;
}
