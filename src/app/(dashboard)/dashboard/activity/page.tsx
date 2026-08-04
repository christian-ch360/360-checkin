import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { getOperationsSummary } from "@/features/dashboard/services/operations-summary.service";
import { getMyAnalytics } from "@/features/dashboard/services/my-analytics.service";
import { OperationsSummary } from "@/features/dashboard/components/operations-summary";
import { MyAnalytics } from "@/features/dashboard/components/my-analytics";

export const dynamic = "force-dynamic";

export default async function DashboardActivityPage() {
  const actor = await requireCurrentMember();

  if (hasPermission(actor.systemRole, "admin.access")) {
    const data = await getOperationsSummary(actor.organizationId);
    return <OperationsSummary data={data} />;
  }

  const data = await getMyAnalytics(actor.id);
  return <MyAnalytics data={data} />;
}
