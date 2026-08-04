import type { ReactNode } from "react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { DashboardTabNav } from "@/features/dashboard/components/dashboard-tab-nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const actor = await requireCurrentMember();
  const canSeeAnalytics = hasPermission(actor.systemRole, "reports.view");
  const isAdminTier = hasPermission(actor.systemRole, "admin.access");

  const tabs = [
    { title: "Overview", href: "/dashboard" },
    { title: "Spaces", href: "/dashboard/spaces" },
    { title: isAdminTier ? "Operations" : "My Analytics", href: "/dashboard/activity" },
    ...(canSeeAnalytics ? [{ title: "Analytics", href: "/dashboard/analytics" }] : []),
  ];

  return (
    <div className="space-y-8">
      <DashboardTabNav tabs={tabs} />
      {children}
    </div>
  );
}
