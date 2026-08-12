import "server-only";

import { prisma } from "@/lib/db/prisma";

export type SearchResult = {
  id: string;
  type: "member" | "project" | "company" | "brand" | "space" | "collabPost";
  title: string;
  subtitle?: string;
  href: string;
};

export async function globalSearch(
  organizationId: string,
  query: string
): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  const q = query.trim();

  const [members, projects, companies, brands, spaces, collabPosts] = await Promise.all([
    prisma.member.findMany({
      where: {
        organizationId,
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { memberNumber: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, fullName: true, memberNumber: true },
    }),
    prisma.project.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { projectCode: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, name: true, projectCode: true },
    }),
    prisma.company.findMany({
      where: { organizationId, name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true },
    }),
    prisma.brand.findMany({
      where: { organizationId, name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true },
    }),
    prisma.space.findMany({
      where: { organizationId, isActive: true, name: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, name: true, type: true },
    }),
    prisma.collabPost.findMany({
      where: { organizationId, status: "OPEN", title: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, title: true, category: true },
    }),
  ]);

  return [
    ...members.map((m) => ({
      id: m.id,
      type: "member" as const,
      title: m.fullName,
      subtitle: m.memberNumber,
      href: `/members/${m.id}`,
    })),
    ...projects.map((p) => ({
      id: p.id,
      type: "project" as const,
      title: p.name,
      subtitle: p.projectCode,
      href: `/projects/${p.id}`,
    })),
    ...companies.map((c) => ({
      id: c.id,
      type: "company" as const,
      title: c.name,
      href: `/companies/${c.id}`,
    })),
    ...brands.map((b) => ({
      id: b.id,
      type: "brand" as const,
      title: b.name,
      href: `/brands/${b.id}`,
    })),
    ...spaces.map((s) => ({
      id: s.id,
      type: "space" as const,
      title: s.name,
      subtitle: s.type.replaceAll("_", " "),
      href: `/spaces/${s.id}`,
    })),
    ...collabPosts.map((p) => ({
      id: p.id,
      type: "collabPost" as const,
      title: p.title,
      subtitle: p.category.replaceAll("_", " "),
      href: `/community/collabs/${p.id}`,
    })),
  ];
}
