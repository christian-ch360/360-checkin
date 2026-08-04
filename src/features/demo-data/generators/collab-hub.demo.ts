import "server-only";

import { getDemoUniverse } from "@/features/demo-data/seed/universe";
import type { listCollabPosts } from "@/features/collab-hub/services/collab-post.service";
import type { CollabFilters } from "@/features/collab-hub/services/collab-hub.service";

type CollabPostFilters = NonNullable<Parameters<typeof listCollabPosts>[1]>;

export function demoListCollabPosts(filters: CollabPostFilters = {}) {
  const { collabPosts } = getDemoUniverse();

  let filtered = collabPosts;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  if (filters.category) filtered = filtered.filter((p) => p.category === filters.category);
  if (filters.budgetType) filtered = filtered.filter((p) => p.budgetType === filters.budgetType);
  if (filters.status) filtered = filtered.filter((p) => p.status === filters.status);

  return filtered;
}

export function demoListCollabMembers(filters: CollabFilters = {}) {
  const { collabMembers } = getDemoUniverse();

  let filtered = collabMembers;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((m) => m.fullName.toLowerCase().includes(q));
  }
  if (filters.role) filtered = filtered.filter((m) => m.role === filters.role);
  if (filters.availableOnly) filtered = filtered.filter((m) => m.availableForCollab);
  if (filters.skill) filtered = filtered.filter((m) => m.skills.includes(filters.skill as string));

  return filtered;
}

export function demoListAllSkills(): string[] {
  const { collabMembers } = getDemoUniverse();
  return Array.from(new Set(collabMembers.flatMap((m) => m.skills))).sort();
}
