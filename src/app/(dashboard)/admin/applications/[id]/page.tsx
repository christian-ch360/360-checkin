import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { getApplicationById, getApplicationHistory } from "@/features/applications/services/applications.service";
import { ApplicationReview } from "@/features/applications/components/application-review";

export const dynamic = "force-dynamic";

export const metadata = { title: "Review Application" };

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.approve")) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const application = await getApplicationById(actor.organizationId, id);
  if (!application) notFound();

  const history = await getApplicationHistory(actor.organizationId, id);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/applications"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to applications
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{application.fullName}</h1>
        <p className="text-sm text-muted-foreground">Applied {application.role.toLowerCase()} membership</p>
      </div>

      <ApplicationReview
        application={{
          id: application.id,
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          role: application.role,
          company: application.company,
          website: application.website,
          businessRegistrationNumber: application.businessRegistrationNumber,
          instagram: application.instagram,
          tiktok: application.tiktok,
          youtube: application.youtube,
          city: application.city,
          state: application.state,
          country: application.country,
          referredBy: application.referralLink
            ? { name: application.referralLink.referrer.fullName, code: application.referralLink.referralCode }
            : null,
          status: application.status,
          notes: application.notes,
          notesUpdatedAt: application.notesUpdatedAt?.toISOString() ?? null,
          notesUpdatedBy: application.notesUpdatedBy,
          createdAt: application.createdAt.toISOString(),
          reviewedAt: application.reviewedAt?.toISOString() ?? null,
          reviewedBy: application.reviewedBy,
          duplicateOf: application.duplicateOf,
          duplicatesOfThis: application.duplicatesOfThis,
          duplicateResolvedAt: application.duplicateResolvedAt?.toISOString() ?? null,
          duplicateResolvedBy: application.duplicateResolvedBy,
          duplicateResolutionNote: application.duplicateResolutionNote,
        }}
        history={history.map((h) => ({ ...h, createdAt: h.createdAt.toISOString() }))}
      />
    </div>
  );
}
