import "server-only";

import { getDemoUniverse } from "@/features/demo-data/seed/universe";
import type { listProjects } from "@/features/projects/services/projects.service";

type ProjectFilters = NonNullable<Parameters<typeof listProjects>[1]>;

export function demoListProjects(filters: ProjectFilters = {}) {
  const { projects } = getDemoUniverse();

  let filtered = projects;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q));
  }
  if (filters.status) filtered = filtered.filter((p) => p.status === filters.status);

  return filtered;
}
