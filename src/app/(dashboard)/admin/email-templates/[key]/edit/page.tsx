import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmailTemplateEditor } from "@/features/communications/components/email-template-editor";
import { getEmailTemplateForEdit, getAvailableVariables } from "@/features/communications/services/email-template-admin.service";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: `Edit ${key.replace(/_/g, " ")}` };
}

export default async function EditEmailTemplatePage({ params }: { params: Promise<{ key: string }> }) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "communications.manage")) {
    redirect("/admin/email-templates");
  }

  const { key } = await params;
  const template = await getEmailTemplateForEdit(actor.organizationId, key);
  if (!template) notFound();

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
        <PageHeader
          title={`Edit ${template.name}`}
          description={template.isSystem ? "Editing a system template — saving creates an override; the code default stays untouched." : "Editing a custom template."}
        />
      </div>

      <EmailTemplateEditor
        mode="edit"
        initial={{
          templateKey: template.templateKey,
          isSystem: template.isSystem,
          isNew: template.isNew,
          name: template.name,
          description: template.description,
          category: template.category,
          subject: template.subject,
          previewText: template.previewText,
          bodyHtml: template.bodyHtml,
          status: template.status,
          updatedAt: template.updatedAt?.toISOString() ?? null,
          updatedByName: template.updatedByName,
        }}
        availableVariables={getAvailableVariables(template.templateKey)}
      />
    </div>
  );
}
