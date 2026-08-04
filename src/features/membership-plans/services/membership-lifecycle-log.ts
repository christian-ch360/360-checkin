import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { MembershipLifecycleEventType, Prisma } from "@prisma/client";

/** The single write path every membership analytics number is later read back from — see membership-analytics.service.ts. */
export async function logMembershipLifecycleEvent(params: {
  organizationId: string;
  memberId: string;
  type: MembershipLifecycleEventType;
  fromPlanId?: string | null;
  toPlanId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.membershipLifecycleEvent.create({
    data: {
      organizationId: params.organizationId,
      memberId: params.memberId,
      type: params.type,
      fromPlanId: params.fromPlanId ?? null,
      toPlanId: params.toPlanId ?? null,
      metadata: params.metadata,
    },
  });
}
