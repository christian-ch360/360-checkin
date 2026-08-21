import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { CommandPalette } from "@/components/layout/command-palette";
import { ApplicationStatusScreen } from "@/features/auth/components/application-status-screen";
import { DemoModeBanner } from "@/components/layout/demo-mode-banner";
import { isDemoModeActive } from "@/features/demo-data";
import { getOutstandingAcceptanceTypes } from "@/features/legal/services/legal.service";
import { LegalReacceptanceBanner } from "@/features/legal/components/legal-reacceptance-banner";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const member = await getCurrentMember();

  if (!member) {
    redirect("/login");
  }

  // Pending/rejected members can log in but see nothing else — no sidebar, no
  // nav, no access to any dashboard route — until an admin resolves their
  // application. This gates the entire (dashboard) route group in one place
  // rather than requiring every page to remember to check status.
  if (member.status === "PENDING" || member.status === "REJECTED") {
    return <ApplicationStatusScreen status={member.status} rejectionReason={member.rejectionReason} />;
  }

  const outstandingLegal = await getOutstandingAcceptanceTypes(member.organizationId, member.id);

  return (
    <div className="flex min-h-svh">
      <Sidebar role={member.systemRole} memberRole={member.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/*
          Header + notification banners share one sticky group so the banner always renders
          directly below the header and never scrolls out from under it — no hardcoded header
          height needed, the header's real (possibly safe-area-adjusted) height just falls out
          of normal flow inside this wrapper. z-40 sits below Modal/Drawer/Dropdown (z-50) and
          above page content (unstyled/z-auto), per the app's stacking order.
        */}
        <div className="sticky top-0 z-40 flex flex-col">
          <Topbar
            role={member.systemRole}
            memberRole={member.role}
            memberId={member.id}
            fullName={member.fullName}
            email={member.email}
            photoUrl={member.profilePhotoUrl}
            memberNumber={member.memberNumber}
          />
          {isDemoModeActive(member) && <DemoModeBanner />}
          {outstandingLegal.length > 0 && <LegalReacceptanceBanner />}
        </div>
        <main className="flex-1 overflow-x-hidden bg-muted/20 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}
