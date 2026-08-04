import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AgencyAccessOverrideForm } from "@/features/agencies/components/agency-access-override-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agency Access Override" };

/** "Only Super Admins may override this process" — same gate as overrideAgencyAccessAction itself. */
export default async function AgencyOverridePage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "agencies.access_override")) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <PageHeader
        title="Agency Access Override"
        description="Manually attach a member to an agency, bypassing the normal request/approval flow."
      />
      <AgencyAccessOverrideForm />
    </div>
  );
}
