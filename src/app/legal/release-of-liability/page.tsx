import { notFound } from "next/navigation";
import { LegalDocumentView } from "@/features/legal/components/legal-document-view";
import { getDefaultOrganizationId, getPublishedDocumentView } from "@/features/legal/services/legal-documents.service";

export const metadata = { title: "Release of Liability" };
export const dynamic = "force-dynamic";

export default async function LiabilityReleasePage() {
  const organizationId = await getDefaultOrganizationId();
  if (!organizationId) notFound();
  const document = await getPublishedDocumentView(organizationId, "LIABILITY_RELEASE");
  return <LegalDocumentView document={document} />;
}
