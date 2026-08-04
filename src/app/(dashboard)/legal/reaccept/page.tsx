import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getOutstandingAcceptanceTypes } from "@/features/legal/services/legal.service";
import { getDocumentHref } from "@/features/legal/documents";
import { LegalReacceptForm, type ReacceptGroup } from "@/features/legal/components/legal-reaccept-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Review Updated Legal Documents" };

const ALL_GROUPS: Omit<ReacceptGroup, "links">[] = [
  { id: "terms", label: "Terms & Conditions", documentTypes: ["TERMS"] },
  { id: "privacy", label: "Privacy Policy", documentTypes: ["PRIVACY", "DATA_PROCESSING"] },
  { id: "media", label: "Media Release & Release of Liability", documentTypes: ["MEDIA_RELEASE", "LIABILITY_RELEASE"] },
];

export default async function LegalReacceptPage() {
  const actor = await requireCurrentMember();
  const outstanding = await getOutstandingAcceptanceTypes(actor.organizationId, actor.id);

  if (outstanding.length === 0) {
    redirect("/dashboard");
  }

  const groups: ReacceptGroup[] = ALL_GROUPS.filter((g) => g.documentTypes.some((t) => outstanding.includes(t))).map(
    (g) => ({
      ...g,
      links:
        g.id === "media"
          ? [
              { href: getDocumentHref("MEDIA_RELEASE"), label: "Media Release" },
              { href: getDocumentHref("LIABILITY_RELEASE"), label: "Release of Liability" },
            ]
          : [{ href: getDocumentHref(g.documentTypes[0]), label: g.label }],
    })
  );

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ScrollText className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Updated Legal Documents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ve updated one or more legal documents. Please review and accept them before continuing to use
            CreatorHub360.
          </p>
        </div>
      </div>

      <LegalReacceptForm groups={groups} />
    </div>
  );
}
