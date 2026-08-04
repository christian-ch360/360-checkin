import "server-only";

import { getDemoUniverse } from "@/features/demo-data/seed/universe";

export function demoListUpcomingEvents(take?: number) {
  const { events } = getDemoUniverse();
  return typeof take === "number" ? events.slice(0, take) : events;
}
