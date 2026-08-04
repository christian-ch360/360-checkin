import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LegalPageType } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { LEGAL_DOCUMENTS } from "@/features/legal/documents";
import {
  LEGAL_PAGE_TYPES,
  listVersions,
  getLatestPublishedVersionRow,
} from "@/features/legal/services/legal-documents.service";
import { VersionHistoryPanel } from "@/features/legal/components/admin/version-history-panel";
import { NewDraftButton } from "@/features/legal/components/admin/new-draft-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ documentType: string }> }) {
  const { documentType } = await params;
  const pageType = documentType.toUpperCase() as LegalPageType;
  return { title: LEGAL_DOCUMENTS[pageType]?.title ?? "Legal Document" };
}

export default async function AdminLegalDocumentPage({
  params,
}: {
  params: Promise<{ documentType: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "legal.manage")) redirect("/dashboard");

  const { documentType: rawType } = await params;
  const pageType = rawType.toUpperCase() as LegalPageType;
  if (!LEGAL_PAGE_TYPES.includes(pageType)) notFound();

  const canPublish = hasPermission(actor.systemRole, "legal.publish");

  const [versions, currentPublished] = await Promise.all([
    listVersions(actor.organizationId, pageType),
    getLatestPublishedVersionRow(actor.organizationId, pageType),
  ]);

  const staticDoc = LEGAL_DOCUMENTS[pageType];
  const draftSeed = currentPublished
    ? {
        version: "",
        title: currentPublished.title,
        summary: currentPublished.summary,
        changeSummary: "",
        sections: currentPublished.sections as unknown as (typeof staticDoc)["sections"],
      }
    : { version: "", title: staticDoc.title, summary: staticDoc.summary, changeSummary: "", sections: staticDoc.sections };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/legal"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Legal
        </Link>
        <PageHeader
          title={staticDoc.title}
          description="Version history, drafts, and publishing for this document."
          actions={<NewDraftButton documentType={pageType} seed={draftSeed} />}
        />
      </div>

      <VersionHistoryPanel
        documentType={pageType}
        versions={versions}
        canManage={hasPermission(actor.systemRole, "legal.manage")}
        canPublish={canPublish}
      />
    </div>
  );
}
