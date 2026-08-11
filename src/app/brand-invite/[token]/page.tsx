import { getValidBrandInvitation } from "@/features/agencies/services/brand-invitations.service";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { BrandInviteCard } from "@/features/agencies/components/brand-invite-card";
import { AuthPageHeader } from "@/features/auth/components/auth-page-header";
import { SafeAreaView } from "@/components/layout/safe-area-view";

export const metadata = { title: "Brand Portal Invitation" };
export const dynamic = "force-dynamic";

export default async function BrandInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invitation, currentMember] = await Promise.all([getValidBrandInvitation(token), getCurrentMember()]);

  return (
    <SafeAreaView className="flex min-h-svh flex-col items-center gap-10 bg-white px-5 py-12 sm:px-8 sm:py-16">
      <AuthPageHeader headline="Join CreatorHub360" subheadline="You've been invited to view your brand's campaigns and contracts." />
      <BrandInviteCard
        token={token}
        invitation={invitation}
        isLoggedIn={Boolean(currentMember)}
      />
    </SafeAreaView>
  );
}
