import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { getKioskManagerDashboard } from "@/features/kiosk/services/kiosk-dashboard.service";
import { getHomepageSections } from "@/features/kiosk/services/kiosk-sections.service";
import { listAnnouncements } from "@/features/kiosk/services/kiosk-announcements.service";
import { getThemeAnalytics, getInteractionTimeSeries } from "@/features/kiosk/services/kiosk-analytics.service";
import { KioskManagerShell } from "@/features/kiosk/components/admin/kiosk-manager-shell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kiosk Manager" };

/** "Only Super Admins can access this page." Same gate as every other kiosk.manage action —
 * ADMIN is deliberately never granted this permission (see lib/permissions/index.ts). */
export default async function KioskManagerPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "kiosk.manage")) redirect("/dashboard");

  const [dashboard, sections, announcements, analytics, timeSeries] = await Promise.all([
    getKioskManagerDashboard(actor.organizationId),
    getHomepageSections(actor.organizationId),
    listAnnouncements(actor.organizationId),
    getThemeAnalytics(actor.organizationId),
    getInteractionTimeSeries(actor.organizationId),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kiosk Manager"
        description="The dynamic kiosk experience — themes, homepage layout, announcements, and analytics."
      />
      <KioskManagerShell
        dashboard={dashboard}
        sections={sections}
        announcements={announcements}
        analytics={analytics}
        timeSeries={timeSeries}
      />
    </div>
  );
}
