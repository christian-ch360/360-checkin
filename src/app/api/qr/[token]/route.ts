import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { resolveQRToken } from "@/features/qr/services/qr-asset.service";
import { getCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Member QR codes are private: the owner and Admins/Super Admins may view
  // them, any other logged-in member may not. Requests with no session at
  // all (e.g. this image loading inside the welcome/approval email, which
  // carries no auth cookie) pass through unchanged — this endpoint has to
  // stay reachable without a session for that to keep working.
  const asset = await resolveQRToken(token);
  let isMemberAsset = false;
  if (asset?.type === "MEMBER" && asset.member) {
    isMemberAsset = true;
    const actor = await getCurrentMember();
    if (actor && actor.id !== asset.member.id && !hasPermission(actor.systemRole, "members.manage")) {
      return NextResponse.json({ error: "You don't have permission to view this QR code." }, { status: 403 });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const scanUrl = `${appUrl}/scan/${token}`;

  const png = await QRCode.toBuffer(scanUrl, {
    type: "png",
    width: 512,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Member QR images are access-controlled per requester — a shared/CDN
      // cache serving a previously-authorized response to a different,
      // unauthorized member would silently bypass the check above. Every
      // other QR type (space/project/brand/etc.) keeps the original
      // long-lived public cache.
      "Cache-Control": isMemberAsset ? "private, no-store" : "public, max-age=31536000, immutable",
    },
  });
}
