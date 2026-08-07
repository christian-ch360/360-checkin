import "server-only";

import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/db/prisma";
import { ensureQRAsset } from "@/features/qr/services/qr-asset.service";

/**
 * The lightweight, always-available "today's/featured event" banner shown on
 * the kiosk home screen when no admin-authored KioskTheme is currently live.
 * Prefers an admin-featured event (Event.isFeatured — "only one at a time"),
 * falling back to whatever's happening today, same precedence as the Kiosk
 * Manager dashboard's "Today's Event" card.
 */
export async function getKioskFeaturedEvent(organizationId: string) {
  const now = new Date();
  const featured = await prisma.event.findFirst({
    where: { organizationId, status: "PUBLISHED", isFeatured: true },
    include: { rsvps: { where: { status: "GOING" }, select: { id: true } } },
  });
  const event =
    featured ??
    (await prisma.event.findFirst({
      where: { organizationId, status: "PUBLISHED", startTime: { gte: startOfDay(now) }, endTime: { lte: endOfDay(now) } },
      orderBy: { startTime: "asc" },
      include: { rsvps: { where: { status: "GOING" }, select: { id: true } } },
    }));

  if (!event || event.endTime < now) return null;

  const [qrAsset, organization] = await Promise.all([
    ensureQRAsset({ type: "EVENT", eventId: event.id }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { logoUrl: true } }),
  ]);

  return {
    id: event.id,
    title: event.title,
    location: event.location,
    startTime: event.startTime,
    endTime: event.endTime,
    capacity: event.capacity,
    goingCount: event.rsvps.length,
    qrToken: qrAsset.token,
    logoUrl: event.logoUrl,
    organizationLogoUrl: organization?.logoUrl ?? null,
  };
}

export type KioskFeaturedEvent = Awaited<ReturnType<typeof getKioskFeaturedEvent>>;
