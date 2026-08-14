import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmailTemplateEditor } from "@/features/communications/components/email-template-editor";
import { getAvailableVariables } from "@/features/communications/services/email-template-admin.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "New Email Template" };

export default async function NewEmailTemplatePage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "communications.manage")) {
    redirect("/admin/email-templates");
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/email-templates"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Email Templates
        </Link>
        <PageHeader title="New Email Template" description="Create a custom template — write it, preview it, and test it before activating." />
      </div>

      <EmailTemplateEditor
        mode="create"
        initial={{
          templateKey: "",
          isSystem: false,
          isNew: true,
          name: "",
          description: "",
          category: "MARKETING",
          subject: "",
          previewText: "",
          bodyHtml: "",
          status: "DRAFT",
          updatedAt: null,
          updatedByName: null,
        }}
        availableVariables={getAvailableVariables("__new_custom_template__")}
      />
    </div>
  );
}
