import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { prisma } from "@/lib/db/prisma";
import { hasPermission } from "@/lib/permissions";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsShell } from "@/features/settings/components/settings-shell";
import { SETTINGS_TABS, isSettingsTabId, DEFAULT_SETTINGS_TAB } from "@/features/settings/config/settings-tabs";
import { ProfileSection } from "@/features/settings/components/sections/profile-section";
import { SecuritySection } from "@/features/settings/components/sections/security-section";
import { ChangeEmailSection } from "@/features/settings/components/sections/change-email-section";
import { SettingsMembershipTab } from "@/features/settings/components/sections/settings-membership-tab";
import { getMemberMembership } from "@/features/creator-dashboard/services/membership.service";
import { listSwitchablePlans } from "@/features/membership-plans/services/membership-plans.service";
import { QrCodeSection } from "@/features/settings/components/sections/qr-code-section";
import { NotificationsSection } from "@/features/settings/components/sections/notifications-section";
import { AppearanceSection } from "@/features/settings/components/sections/appearance-section";
import { AdminSection } from "@/features/settings/components/sections/admin-section";
import { ActiveSessionsSection } from "@/features/settings/components/sections/active-sessions-section";
import { DeveloperToolsSection } from "@/features/settings/components/sections/developer-tools-section";
import { LegalSection } from "@/features/settings/components/sections/legal-section";
import { getMemberLegalAcceptances } from "@/features/legal/services/legal.service";
import { SettingsAgencyTab } from "@/features/settings/components/sections/settings-agency-tab";
import { getCreatorAgencyStatus, getAgencyDashboardData } from "@/features/referrals/services/referral.service";
import { ensureReferralCode } from "@/features/referrals/services/referral-code";
import { getAgencyTeam, isAgencyAdmin } from "@/features/agencies/services/agency-access.service";
import { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const def = SETTINGS_TABS.find((t) => t.id === tab);
  return { title: def ? `${def.label} · Settings` : "Settings" };
}

export default async function SettingsTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  const actor = await requireCurrentMember();

  const isAdmin = hasPermission(actor.systemRole, "admin.access");
  const isSuperAdmin = hasPermission(actor.systemRole, "dev_tools.access");

  const visibleTabs = SETTINGS_TABS.filter((t) => {
    if (t.id === "admin") return isAdmin;
    if (t.id === "developer-tools") return isSuperAdmin;
    return true;
  });

  if (!isSettingsTabId(tab) || !visibleTabs.some((t) => t.id === tab)) {
    redirect(`/settings/${DEFAULT_SETTINGS_TAB}`);
  }

  const member = await prisma.member.findUniqueOrThrow({
    where: { id: actor.id },
    include: { qrAsset: true },
  });
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: actor.organizationId },
    select: { name: true },
  });

  let content: React.ReactNode;

  switch (tab) {
    case "profile": {
      const connections = await getConnectionsForMember(actor.id);
      content = (
        <ProfileSection
          id={member.id}
          fullName={member.fullName}
          email={member.email}
          phone={member.phone}
          website={member.website}
          bio={member.bio}
          location={member.location}
          profilePhotoUrl={member.profilePhotoUrl}
          skills={member.skills}
          contentCategories={member.contentCategories}
          lookingFor={member.lookingFor}
          instagramUrl={member.instagramUrl}
          tiktokUrl={member.tiktokUrl}
          youtubeUrl={member.youtubeUrl}
          linkedinUrl={member.linkedinUrl}
          availableForCollab={member.availableForCollab}
          visibleInDirectory={member.visibleInDirectory}
          memberNumber={member.memberNumber}
          role={member.role}
          organizationName={organization.name}
          memberSince={member.memberSince}
          connections={connections}
          username={member.username}
          displayName={member.displayName}
          bannerImageUrl={member.bannerImageUrl}
        />
      );
      break;
    }
    case "membership": {
      const [membership, switchablePlans] = await Promise.all([
        getMemberMembership(actor.id),
        listSwitchablePlans(actor.organizationId, member.role),
      ]);
      content = (
        <SettingsMembershipTab
          membership={membership}
          switchablePlans={switchablePlans}
          memberFullName={member.fullName}
          memberNumber={member.memberNumber}
        />
      );
      break;
    }
    case "agency": {
      const isAgency = member.role === "AGENCY";
      if (!isAgency) {
        const status = await getCreatorAgencyStatus(actor.organizationId, actor.id);
        content = <SettingsAgencyTab isAgency={false} creatorStatus={status} agencyData={null} agencyRole={null} team={[]} canManageAgency={false} />;
      } else {
        const effectiveAgencyId = member.agencyId ?? member.id;
        const isCanonical = effectiveAgencyId === member.id;
        if (isCanonical && !member.referralCode) {
          await ensureReferralCode(member.id, member.role);
        }
        if (isCanonical && !member.agencyRole) {
          await prisma.member.update({ where: { id: member.id }, data: { agencyRole: "OWNER" } });
        }
        const canManageAgency = isAgencyAdmin(
          { id: member.id, agencyId: member.agencyId, agencyRole: member.agencyRole },
          effectiveAgencyId
        );
        const [agencyData, team] = await Promise.all([
          getAgencyDashboardData(actor.organizationId, effectiveAgencyId),
          getAgencyTeam(actor.organizationId, effectiveAgencyId),
        ]);
        content = (
          <SettingsAgencyTab
            isAgency
            creatorStatus={null}
            agencyData={agencyData}
            agencyRole={isCanonical ? "OWNER" : member.agencyRole}
            team={team}
            canManageAgency={canManageAgency}
          />
        );
      }
      break;
    }
    case "qr-code": {
      const qrAsset = member.qrAsset ?? (await ensureQRAsset({ type: "MEMBER", memberId: member.id }));
      content = (
        <QrCodeSection
          memberId={member.id}
          token={qrAsset.token}
          fullName={member.fullName}
          memberNumber={member.memberNumber}
          role={member.role}
          tierCode={actor.commissionTier?.code ?? null}
          organizationName={organization.name}
        />
      );
      break;
    }
    case "security":
      content = <SecuritySection />;
      break;
    case "change-email":
      content = <ChangeEmailSection currentEmail={member.email} />;
      break;
    case "notifications":
      content = (
        <NotificationsSection
          notifyEmail={member.notifyEmail}
          notifyCollabRequests={member.notifyCollabRequests}
          notifyProjectInvites={member.notifyProjectInvites}
          notifySpaceBookings={member.notifySpaceBookings}
          notifyVisitorArrivals={member.notifyVisitorArrivals}
          notifyWeeklySummary={member.notifyWeeklySummary}
          notifyProductUpdates={member.notifyProductUpdates}
        />
      );
      break;
    case "appearance":
      content = <AppearanceSection />;
      break;
    case "active-sessions":
      content = <ActiveSessionsSection />;
      break;
    case "legal": {
      const acceptances = await getMemberLegalAcceptances(actor.organizationId, actor.id);
      content = <LegalSection acceptances={acceptances} />;
      break;
    }
    case "admin":
      content = (
        <AdminSection
          canManageKiosk={hasPermission(actor.systemRole, "kiosk.manage")}
          canOverrideAgencyAccess={hasPermission(actor.systemRole, "agencies.access_override")}
        />
      );
      break;
    case "developer-tools":
      content = <DeveloperToolsSection demoModeEnabled={member.demoModeEnabled} />;
      break;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Manage your profile, security, and preferences." />

      <SettingsShell
        tabs={visibleTabs.map((t) => ({ id: t.id, label: t.label, href: `/settings/${t.id}` }))}
        activeTab={tab}
      >
        {content}
      </SettingsShell>
    </div>
  );
}
