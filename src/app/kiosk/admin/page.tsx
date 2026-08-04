import { redirect } from "next/navigation";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { getFacilityOverview, getAttendanceHistory } from "@/features/checkin/services/checkin.service";
import { getWaitingVisitors, getOnSiteVisitors, getRecentVisitors, getTodayVisitorCount } from "@/features/visitors/services/visitor.service";
import { KioskAdminDashboard } from "@/features/kiosk/components/admin/kiosk-admin-dashboard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Kiosk Admin" };

// This route sits outside the (dashboard) layout (which is what normally
// guards authenticated pages), and middleware alone isn't relied on here —
// same defense-in-depth pattern as (dashboard)/layout.tsx: check directly.
export default async function KioskAdminPage() {
  const actor = await getCurrentMember();
  if (!actor) {
    redirect("/login?redirectTo=/kiosk/admin");
  }
  if (!hasPermission(actor.systemRole, "checkin.manage")) {
    redirect("/dashboard");
  }

  const [overview, recentCheckIns, waitingVisitors, onSiteVisitors, recentVisitors, todayVisitorCount] = await Promise.all([
    getFacilityOverview(actor.organizationId),
    getAttendanceHistory(actor.organizationId, 25),
    getWaitingVisitors(actor.organizationId),
    getOnSiteVisitors(actor.organizationId),
    getRecentVisitors(actor.organizationId, 25),
    getTodayVisitorCount(actor.organizationId),
  ]);

  return (
    <KioskAdminDashboard
      overview={{
        currentlyIn: overview.currentlyIn.map((c) => ({
          id: c.id,
          checkIn: c.checkIn,
          member: c.member,
        })),
        todayCheckIns: overview.todayCheckIns,
        todayCheckOuts: overview.todayCheckOuts,
      }}
      recentCheckIns={recentCheckIns.map((c) => ({
        id: c.id,
        checkIn: c.checkIn,
        checkOut: c.checkOut,
        duration: c.duration,
        status: c.status,
        member: c.member,
      }))}
      waitingVisitors={waitingVisitors}
      onSiteVisitors={onSiteVisitors}
      recentVisitors={recentVisitors}
      todayVisitorCount={todayVisitorCount}
    />
  );
}
