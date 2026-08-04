import "server-only";

import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { getAdminKpis } from "@/features/dashboard/services/admin-kpis.service";
import { EmailService } from "@/lib/email/email-service";

/** Runs daily — sends every org's admins a summary of the prior day's activity plus current org-wide counts. */
export async function runDailyAdminSummary() {
  const organizations = await prisma.organization.findMany({ select: { id: true } });
  const yesterdayStart = startOfDay(subDays(new Date(), 1));
  const todayStart = startOfDay(new Date());
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let emailsSent = 0;
  for (const org of organizations) {
    const [kpis, newApplicationsToday, newCreatorsToday, admins] = await Promise.all([
      getAdminKpis(org.id),
      prisma.membershipApplication.count({
        where: { organizationId: org.id, createdAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      prisma.member.count({
        where: { organizationId: org.id, role: "CREATOR", createdAt: { gte: yesterdayStart, lt: todayStart } },
      }),
      prisma.member.findMany({
        where: { organizationId: org.id, status: "ACTIVE" },
        select: { id: true, email: true, fullName: true, systemRole: true },
      }),
    ]);

    for (const admin of admins.filter((a) => hasPermission(a.systemRole, "admin.access"))) {
      await EmailService.sendAdminSummary({
        to: admin.email,
        fullName: admin.fullName,
        date: yesterdayStart,
        stats: {
          newApplicationsToday,
          newCreatorsToday,
          pendingApplications: kpis.members.pendingApplications,
          totalMembers: kpis.members.totalMembers,
        },
        dashboardUrl: `${appUrl}/dashboard`,
        organizationId: org.id,
        memberId: admin.id,
      });
      emailsSent++;
    }
  }

  return { organizationsProcessed: organizations.length, emailsSent };
}
