import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { isAgencyAdmin } from "@/features/agencies/services/agency-access.service";
import { AgencyReferralCard } from "@/features/referrals/components/agency-referral-card";
import { AgencyProfileForm } from "@/features/agencies/components/agency-profile-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agency Settings" };

export default async function AgencyProfileSettingsPage() {
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");
  if (!actor.agencyId && !actor.referralCode) redirect("/agency");

  const effectiveAgencyId = actor.agencyId ?? actor.id;
  const canManageAgency = isAgencyAdmin(actor, effectiveAgencyId);

  const agency = await prisma.member.findFirst({
    where: { id: effectiveAgencyId, organizationId: actor.organizationId, deletedAt: null },
    select: {
      fullName: true,
      website: true,
      bio: true,
      location: true,
      businessRegistrationNumber: true,
      agencyCategories: true,
      instagramUrl: true,
      tiktokUrl: true,
      youtubeUrl: true,
      linkedinUrl: true,
      profilePhotoUrl: true,
      referralCode: true,
    },
  });
  if (!agency) redirect("/agency");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Agency Settings"
        description="Your agency's public profile, contact details, and referral tools."
        actions={
          <Link
            href="/agency"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Agency Dashboard
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          {agency.referralCode ? (
            <AgencyReferralCard referralCode={agency.referralCode} />
          ) : (
            <p className="text-sm text-muted-foreground">Your Agency ID is being generated — refresh in a moment.</p>
          )}
        </div>
        <div className="lg:col-span-2">
          <AgencyProfileForm
            agencyId={effectiveAgencyId}
            canEdit={canManageAgency}
            initial={{
              fullName: agency.fullName,
              website: agency.website ?? "",
              bio: agency.bio ?? "",
              location: agency.location ?? "",
              businessRegistrationNumber: agency.businessRegistrationNumber ?? "",
              agencyCategories: agency.agencyCategories,
              instagramUrl: agency.instagramUrl ?? "",
              tiktokUrl: agency.tiktokUrl ?? "",
              youtubeUrl: agency.youtubeUrl ?? "",
              linkedinUrl: agency.linkedinUrl ?? "",
              profilePhotoUrl: agency.profilePhotoUrl,
            }}
          />
        </div>
      </div>
    </div>
  );
}
