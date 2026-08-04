import "server-only";

import type { QRAssetType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { generateQRToken, verifyQRToken } from "@/features/qr/services/qr-token";

type QRAssetOwner =
  | { type: "MEMBER"; memberId: string }
  | { type: "PROJECT"; projectId: string }
  | { type: "BRAND"; brandId: string }
  | { type: "SPACE"; spaceId: string }
  | { type: "VISITOR"; visitorId: string }
  | { type: "LOCATION"; locationId: string }
  | { type: "EVENT"; eventId: string };

const OWNER_FIELD: Record<
  QRAssetType,
  "memberId" | "projectId" | "brandId" | "spaceId" | "visitorId" | "locationId" | "eventId" | null
> = {
  MEMBER: "memberId",
  PROJECT: "projectId",
  BRAND: "brandId",
  SPACE: "spaceId",
  VISITOR: "visitorId",
  LOCATION: "locationId",
  EVENT: "eventId",
};

export async function ensureQRAsset(owner: QRAssetOwner) {
  const field = OWNER_FIELD[owner.type];
  if (!field) throw new Error(`QR asset type ${owner.type} requires manual creation`);

  const existing = await prisma.qRAsset.findFirst({
    where: { type: owner.type, [field]: (owner as Record<string, string>)[field] },
  });
  if (existing) return existing;

  return prisma.qRAsset.create({
    data: {
      type: owner.type,
      token: generateQRToken(owner.type),
      [field]: (owner as Record<string, string>)[field],
    },
  });
}

export async function resolveQRToken(token: string) {
  // Reject tokens that aren't validly signed by this server before ever touching the DB.
  const signature = verifyQRToken(token);
  if (!signature?.valid) return null;

  return prisma.qRAsset.findUnique({
    where: { token },
    include: {
      member: {
        select: {
          id: true,
          fullName: true,
          memberNumber: true,
          status: true,
          role: true,
          organizationId: true,
          profilePhotoUrl: true,
        },
      },
      project: { select: { id: true, name: true, status: true } },
      brand: { select: { id: true, name: true } },
      space: { select: { id: true, name: true, type: true, isActive: true } },
      visitor: { select: { id: true, firstName: true, lastName: true, status: true, organizationId: true } },
      location: { select: { id: true, name: true, slug: true, type: true, active: true, organizationId: true } },
      event: {
        select: {
          id: true,
          title: true,
          status: true,
          startTime: true,
          endTime: true,
          organizationId: true,
        },
      },
    },
  });
}
