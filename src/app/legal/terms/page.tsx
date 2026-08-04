import { notFound } from "next/navigation";
import { LegalDocumentView } from "@/features/legal/components/legal-document-view";
import { getDefaultOrganizationId, getPublishedDocumentView } from "@/features/legal/services/legal-documents.service";

export const metadata = { title: "Terms & Conditions" };
export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const organizationId = await getDefaultOrganizationId();
  if (!organizationId) notFound();
  const document = await getPublishedDocumentView(organizationId, "TERMS");
  return <LegalDocumentView document={document} />;
}
