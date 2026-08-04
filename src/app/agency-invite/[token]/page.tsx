import { getValidAgencyInvitation } from "@/features/agencies/services/agency-invitations.service";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { AgencyInviteCard } from "@/features/agencies/components/agency-invite-card";
import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { SafeAreaView } from "@/components/layout/safe-area-view";

export const metadata = { title: "Team Invitation" };
export const dynamic = "force-dynamic";

// Public landing page for the CTA link inside AgencyInvitation emails
// (${APP_URL}/agency-invite/${invitation.token}, see agency-invitations.service.ts).
// Same bright, white Apple-inspired shell as /apply and /login — every other
// (auth) page keeps the dark AuthBackground/AuthBrandPanel shell instead.
export default async function AgencyInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, currentMember] = await Promise.all([getValidAgencyInvitation(token), getCurrentMember()]);

  return (
    <SafeAreaView className="flex min-h-svh flex-col items-center gap-10 bg-white px-5 py-12 sm:px-8 sm:py-16">
      <AuthPageHeader headline="Join CreatorHub360" subheadline="You've been invited to join an agency team." />
      <AgencyInviteCard
        token={token}
        invitation={invitation}
        isLoggedIn={Boolean(currentMember)}
      />
    </SafeAreaView>
  );
}
