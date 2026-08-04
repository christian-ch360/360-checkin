import "server-only";

import { prisma } from "@/lib/db/prisma";

export async function listAuditLogs(organizationId: string, take = 100) {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
  });

  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await prisma.member.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } })
    : [];
  const actorNames = new Map(actors.map((a) => [a.id, a.fullName]));

  return logs.map((log) => ({
    ...log,
    actorName: log.actorId ? (actorNames.get(log.actorId) ?? "Unknown member") : "System",
  }));
}

/** Everything logged under the "legal.*" action namespace — publishes,
 * draft edits, downloaded reports, member re-acceptances, and forced
 * re-acceptances — for the Admin Legal dashboard's audit trail. */
export async function listLegalAuditLogs(organizationId: string, take = 100) {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId, action: { startsWith: "legal." } },
    orderBy: { createdAt: "desc" },
    take,
  });

  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id): id is string => Boolean(id)))];
  const entityMemberIds = [
    ...new Set(logs.filter((l) => l.entityType === "member").map((l) => l.entityId)),
  ];
  const memberIds = [...new Set([...actorIds, ...entityMemberIds])];
  const members = memberIds.length
    ? await prisma.member.findMany({ where: { id: { in: memberIds } }, select: { id: true, fullName: true } })
    : [];
  const memberNames = new Map(members.map((m) => [m.id, m.fullName]));

  return logs.map((log) => ({
    ...log,
    actorName: log.actorId ? (memberNames.get(log.actorId) ?? "Unknown member") : "System",
    affectedMemberName: log.entityType === "member" ? (memberNames.get(log.entityId) ?? null) : null,
  }));
}

export async function listMemberAuditLogs(organizationId: string, memberId: string, take = 50) {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId, entityType: "member", entityId: memberId },
    orderBy: { createdAt: "desc" },
    take,
  });

  const actorIds = [...new Set(logs.map((l) => l.actorId).filter((id): id is string => Boolean(id)))];
  const actors = actorIds.length
    ? await prisma.member.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } })
    : [];
  const actorNames = new Map(actors.map((a) => [a.id, a.fullName]));

  return logs.map((log) => ({
    ...log,
    actorName: log.actorId ? (actorNames.get(log.actorId) ?? "Unknown member") : "System",
  }));
}
