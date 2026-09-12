import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { CreatorImportWizard } from "@/features/creator-library/components/creator-import-wizard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import Creators · Creator Library" };

export default async function CreatorImportPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader
        title="Import Creators"
        description="Upload and organize creators into the CreatorHub360 Creator Network."
      />
      <CreatorImportWizard />
    </div>
  );
}
