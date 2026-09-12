import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { CreatorLibrarySettingsForm } from "@/features/creator-library/admin/creator-library-settings-form";
import { getLibrarySettings } from "@/features/creator-library/lib/library-settings";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings · Creator Library" };

export default async function AdminLibrarySettingsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const settings = await getLibrarySettings(actor.organizationId);

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader
        title="Creator Library Settings"
        description="Brand the public CreatorHub360 Creator Network — the hero banner and the fallback card icon."
      />
      <CreatorLibrarySettingsForm settings={settings} />
    </div>
  );
}
