"use client";

import { useMemo } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarDays, Users } from "lucide-react";
import { useCountdown } from "@/features/kiosk/hooks/use-countdown";
import { EventLogo } from "@/features/events/components/event-logo";
import type { KioskFeaturedEvent } from "@/features/kiosk/services/kiosk-featured-event.service";

function formatCountdown(c: { hours: number; minutes: number; seconds: number }) {
  const parts = [];
  if (c.hours > 0) parts.push(`${c.hours}h`);
  if (c.hours > 0 || c.minutes > 0) parts.push(`${c.minutes}m`);
  parts.push(`${c.seconds}s`);
  return parts.join(" ");
}

/**
 * Built-in event promotion — distinct from the richer, admin-authored
 * KioskTheme hero (which takes priority whenever a real theme is scheduled).
 * This is the sensible default for "auto-promote today's/featured event"
 * when nothing fancier has been configured, per the spec's Kiosk Integration
 * section.
 */
export function KioskFeaturedEventBanner({ event }: { event: NonNullable<KioskFeaturedEvent> }) {
  const countdown = useCountdown(event.startTime);
  const remaining = useMemo(() => (event.capacity ? Math.max(0, event.capacity - event.goingCount) : null), [event]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex w-full max-w-2xl flex-col items-center gap-5 rounded-[28px] border border-black/10 bg-white/80 px-8 py-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.08)] backdrop-blur-sm"
    >
      <EventLogo logoUrl={event.logoUrl} organizationLogoUrl={event.organizationLogoUrl} alt={`${event.title} logo`} size={56} />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium tracking-wide text-black/50 uppercase">
        <CalendarDays className="size-3.5" /> Happening {countdown ? "soon" : "now"}
      </span>
      <h2 className="text-2xl font-semibold tracking-tight text-black sm:text-3xl">{event.title}</h2>
      {event.location && <p className="text-sm text-black/50">{event.location}</p>}

      <div className="flex flex-wrap items-center justify-center gap-4">
        {countdown && (
          <div className="rounded-2xl bg-black/[0.03] px-5 py-3">
            <p className="text-[11px] tracking-wide text-black/40 uppercase">Starts in</p>
            <p className="text-lg font-semibold tabular-nums text-black">{formatCountdown(countdown)}</p>
          </div>
        )}
        {remaining !== null && (
          <div className="flex items-center gap-1.5 rounded-2xl bg-black/[0.03] px-5 py-3 text-sm font-medium text-black/70">
            <Users className="size-4" />
            {remaining > 0 ? `${remaining} spots left` : "Full — join waitlist"}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="rounded-2xl border border-black/10 bg-white p-3">
          <Image src={`/api/qr/${event!.qrToken}`} alt="Scan to register" width={128} height={128} unoptimized />
        </div>
        <p className="text-xs text-black/40">Scan to register or check in</p>
      </div>
    </motion.div>
  );
}
