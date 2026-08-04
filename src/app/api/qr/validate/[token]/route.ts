import { NextResponse } from "next/server";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";

/**
 * Resolves any CreatorHub360 QR token to its underlying entity. Signature
 * verification happens inside resolveQRToken, so a tampered or unrecognized
 * token and a nonexistent one both come back as { valid: false }.
 *
 * Shared by facility check-in, space check-in, member verification, and
 * (future) event check-in / member-to-member connection flows — anything
 * that needs to turn a scanned token into an identity should call this
 * instead of re-implementing token resolution.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const asset = await resolveQRToken(token);

  if (!asset) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  if (asset.type === "MEMBER" && asset.member) {
    // Same privacy rule as /api/qr/[token]: the owner and Admins/Super
    // Admins may resolve a member QR, no other logged-in member may. A
    // request with no session at all passes through unchanged.
    const actor = await getCurrentMember();
    if (actor && actor.id !== asset.member.id && !hasPermission(actor.systemRole, "members.manage")) {
      return NextResponse.json({ error: "You don't have permission to view this QR code." }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      type: "MEMBER",
      member: {
        id: asset.member.id,
        fullName: asset.member.fullName,
        memberNumber: asset.member.memberNumber,
        status: asset.member.status,
      },
    });
  }

  if (asset.type === "SPACE" && asset.space) {
    return NextResponse.json({ valid: true, type: "SPACE", space: asset.space });
  }

  if (asset.type === "PROJECT" && asset.project) {
    return NextResponse.json({ valid: true, type: "PROJECT", project: asset.project });
  }

  if (asset.type === "BRAND" && asset.brand) {
    return NextResponse.json({ valid: true, type: "BRAND", brand: asset.brand });
  }

  return NextResponse.json({ valid: true, type: asset.type });
}
