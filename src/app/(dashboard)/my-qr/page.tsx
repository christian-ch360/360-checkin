import { requireCurrentMember } from "@/features/auth/services/current-member";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";
import { MemberQrSection } from "@/features/qr/components/member-qr-section";
import { PageHeader } from "@/components/shared/page-header";

export const dynamic = "force-dynamic";

export const metadata = { title: "My QR Code" };

/**
 * Always renders the caller's own QR — no route param, so "members can only
 * view their own" holds by construction. Admin viewing another member's QR
 * is handled entirely by the existing /members/[id] page's canViewQr gate.
 */
export default async function MyQrCodePage() {
  const member = await requireCurrentMember();
  const qrAsset = await ensureQRAsset({ type: "MEMBER", memberId: member.id });

  return (
    <div className="mx-auto max-w-sm space-y-8">
      <PageHeader title="My QR Code" description="Show this at check-in, events, or building access." />

      <MemberQrSection
        memberId={member.id}
        token={qrAsset.token}
        fullName={member.fullName}
        memberNumber={member.memberNumber}
        canManage={false}
        variant="mobile"
      />
    </div>
  );
}
