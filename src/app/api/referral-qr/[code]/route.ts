import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db/prisma";

/**
 * Public, unauthenticated — an Agency QR code just encodes
 * "creatorhub360.com/apply?agency=AGY-001284", the exact same public URL
 * anyone could type or click. No signed token, no /scan resolution: this
 * intentionally does NOT reuse the internal QRAsset/token system (see
 * qr-asset.service.ts), which is built for private, authenticated
 * check-in-style resolution — the opposite trust model from a plain,
 * shareable join link. Rejects unknown codes so this endpoint can't be used
 * to mint arbitrary junk QR images.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  const referrer = await prisma.member.findFirst({
    where: { referralCode: normalized, deletedAt: null },
    select: { id: true },
  });
  if (!referrer) {
    return NextResponse.json({ error: "Unknown referral code." }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const applyUrl = `${appUrl}/apply?agency=${normalized}`;

  const png = await QRCode.toBuffer(applyUrl, {
    type: "png",
    width: 512,
    margin: 1,
    color: { dark: "#0a0a0a", light: "#ffffff" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      // Referral codes are permanent — the encoded URL never changes for a
      // given code, so this is safe to cache indefinitely, same as every
      // non-Member QRAsset type.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
