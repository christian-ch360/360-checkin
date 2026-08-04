import "server-only";

import { getDemoUniverse } from "@/features/demo-data/seed/universe";
import type { MemberListFilters, MemberListPage } from "@/features/members/services/members.service";

export function demoListMembers(filters: MemberListFilters = {}, pagination: MemberListPage = { page: 1, pageSize: 25 }) {
  const { members } = getDemoUniverse();

  let filtered = members;
  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter((m) => m.fullName.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
  }
  if (filters.role) filtered = filtered.filter((m) => m.role === filters.role);
  if (filters.status) filtered = filtered.filter((m) => m.status === filters.status);
  if (filters.companyId) filtered = filtered.filter((m) => m.companyId === filters.companyId);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize));
  const start = (pagination.page - 1) * pagination.pageSize;
  const members_ = filtered.slice(start, start + pagination.pageSize);

  return { members: members_, total, page: pagination.page, pageSize: pagination.pageSize, pageCount };
}
