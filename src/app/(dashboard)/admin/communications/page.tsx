import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { getEmailHistory } from "@/features/admin/services/communications.service";
import { CommunicationsComposer } from "@/features/admin/components/communications-composer";
import { EmailHistoryTable } from "@/features/admin/components/email-history-table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Communications" };

export default async function CommunicationsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }

  const logs = await getEmailHistory(actor.organizationId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Communications</h1>
        <p className="text-sm text-muted-foreground">
          Search members, send announcements or individual emails, resend welcome emails, and review delivery history.
        </p>
      </div>

      <CommunicationsComposer />
      <EmailHistoryTable logs={logs} />
    </div>
  );
}
