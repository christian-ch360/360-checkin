import { prisma } from "@/lib/db/prisma";
import { getActivePlan } from "@/features/membership-plans/services/membership-plans.service";
import { validateReferralCode } from "@/features/referrals/services/referral.service";
import { getValidAgencyInvitation } from "@/features/agencies/services/agency-invitations.service";
import { ApplyForm } from "@/features/applications/components/apply-form";
import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { SafeAreaView } from "@/components/layout/safe-area-view";

export const metadata = { title: "Apply to Join" };

// Lives at the top level (outside the (auth) route group) the same way
// /login does — both need the bright, white Apple-inspired look; every
// other (auth) page (signup/forgot-password/reset-password/project-invite)
// keeps the original dark AuthBackground/AuthBrandPanel shell.
export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; fullName?: string; email?: string; agency?: string; agencyInviteToken?: string }>;
}) {
  // No logged-in user on this public page to derive an organization from —
  // same "single default org" resolution already used by
  // applications.service.ts for every other public-application query.
  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  // The promo banner advertises the Creator plan specifically — only Creator
  // Type applicants are ever billed (see requiresMembership()).
  const plan = organization ? await getActivePlan(organization.id, "CREATOR") : null;
  const { message, fullName, email, agency, agencyInviteToken } = await searchParams;

  // "The creator should not need to manually type the Agency ID when
  // arriving through a referral link or QR code" — resolved server-side
  // here (not just trusted client-side) so the pre-filled "Connected to"
  // state the form opens with is already validated. submitApplication
  // re-validates again regardless before ever writing it.
  let referral: { code: string; agencyName: string } | null = null;
  if (organization && agency) {
    const result = await validateReferralCode(organization.id, agency);
    if (result.valid) referral = { code: agency.trim().toUpperCase(), agencyName: result.referrerName };
  }

  // "Agency Invitations" — arriving from an Owner/Manager's invite link.
  // Resolved server-side so the locked Role select and pre-filled agency
  // name can't be spoofed by a stale/tampered query string; submitApplication
  // re-validates the token again regardless before ever writing it.
  let agencyInvite: { token: string; agencyName: string; role: string } | null = null;
  if (agencyInviteToken) {
    const invitation = await getValidAgencyInvitation(agencyInviteToken);
    if (invitation) agencyInvite = { token: agencyInviteToken, agencyName: invitation.agencyName, role: invitation.role };
  }

  return (
    <SafeAreaView className="flex min-h-svh flex-col items-center gap-10 bg-white px-5 py-12 sm:px-8 sm:py-16">
      <AuthPageHeader
        headline="Join CreatorHub360"
        subheadline="Connect with creators, brands, agencies, and exclusive opportunities."
      />
      <ApplyForm
        plan={plan}
        message={message}
        defaultFullName={fullName ?? agencyInvite?.agencyName}
        defaultEmail={email}
        referral={referral}
        agencyInvite={agencyInvite}
      />
    </SafeAreaView>
  );
}
