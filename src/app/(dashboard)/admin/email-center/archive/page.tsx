import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmailCenterTabs } from "@/features/communications/components/email-center-tabs";
import {
  EmailCenterListSection,
  type EmailCenterSearchParams,
} from "@/features/communications/components/email-center-list-section";
import { ExportEmailLogsButton } from "@/features/communications/components/export-email-logs-button";

export const dynamic = "force-dynamic";

export const metadata = { title: "Email Archive" };

export default async function EmailArchivePage({
  searchParams,
}: {
  searchParams: Promise<EmailCenterSearchParams>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }
  const canManage = hasPermission(actor.systemRole, "communications.manage");

  const params = await searchParams;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Center"
        description="Emails older than 30 days — kept in full, searchable, and available for the same actions as Inbox."
        actions={canManage ? <ExportEmailLogsButton view="archive" /> : undefined}
      />

      <EmailCenterTabs active="archive" />

      <EmailCenterListSection
        organizationId={actor.organizationId}
        canManage={canManage}
        view="archive"
        searchParams={params}
      />
    </div>
  );
}
