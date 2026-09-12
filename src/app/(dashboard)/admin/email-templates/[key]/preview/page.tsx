import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { SystemTemplatePreviewPanel } from "@/features/communications/components/system-template-preview-panel";
import { isSystemTemplateKey, humanizeTemplateKey } from "@/features/communications/services/email-template-admin.service";
import { renderTemplate } from "@/lib/email/email-types";
import { TEMPLATE_SAMPLE_PROPS } from "@/features/communications/config/template-sample-props";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return { title: `Preview ${key.replace(/_/g, " ")}` };
}

/**
 * "Preview default template" — renders a system template's real code
 * component (not the raw-HTML override editor's content) at sample data, for
 * templates rich enough that hand-copying them into the bodyHtml textarea
 * would lose fidelity to the sanitizer's tag/style stripping (see
 * previewSystemDefaultAction). Every system template can reach this page;
 * it's most useful for one like this that doesn't yet have — and may never
 * need — an override.
 */
export default async function PreviewEmailTemplatePage({ params }: { params: Promise<{ key: string }> }) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/admin/email-templates");
  }

  const { key } = await params;
  if (!isSystemTemplateKey(key)) notFound();

  const { subject, html } = await renderTemplate(key, TEMPLATE_SAMPLE_PROPS[key]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/email-templates/${key}/edit`}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to Edit {humanizeTemplateKey(key)}
        </Link>
        <PageHeader
          title={`Preview: ${humanizeTemplateKey(key)}`}
          description="The real default email this template sends, rendered with sample data — not the override editor's draft content."
        />
      </div>

      <SystemTemplatePreviewPanel templateKey={key} subject={subject} html={html} />
    </div>
  );
}
