import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { getAdminCreatorEditor } from "@/features/creator-library/services/creator-library-admin.service";
import { AdminLibraryEditor } from "@/features/creator-library/admin/admin-library-editor";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit creator · Creator Library" };

export default async function AdminCreatorLibraryEditorPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const { profileId } = await params;
  const editor = await getAdminCreatorEditor(actor.organizationId, profileId);
  if (!editor) notFound();

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <Link
        href="/admin/creator-library"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Creator Library
      </Link>
      <AdminLibraryEditor data={editor} />
    </div>
  );
}
