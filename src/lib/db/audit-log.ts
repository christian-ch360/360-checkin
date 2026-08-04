import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getRequestIp } from "@/lib/http/request-meta";
import type { Prisma } from "@prisma/client";

export async function logAudit(params: {
  organizationId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}) {
  const ipAddress = params.ipAddress !== undefined ? params.ipAddress : await getRequestIp();

  return prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      before: params.before,
      after: params.after,
      ipAddress,
    },
  });
}
