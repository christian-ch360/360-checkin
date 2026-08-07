"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { QrCode, UserPlus, ArrowRight } from "lucide-react";
import { LogoMark } from "@/features/auth/components/logo-mark";
import { KioskHero } from "@/features/kiosk/components/kiosk-hero";
import { KioskRotatingAnnouncements, type KioskAnnouncementCard } from "@/features/kiosk/components/kiosk-rotating-announcements";
import { KioskSponsorSection } from "@/features/kiosk/components/kiosk-sponsor-section";
import { KioskFeaturedEventBanner } from "@/features/kiosk/components/kiosk-featured-event-banner";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import type { KioskFeaturedEvent } from "@/features/kiosk/services/kiosk-featured-event.service";

/** "Welcome Messages — Rotate greetings." Only used on the evergreen entrance
 * screen (no special theme currently active) — an authored theme's own
 * headline/subheadline is never overwritten by rotation. */
const WELCOME_ROTATION: { headline: string; subheadline: string }[] = [
  { headline: "Welcome to CreatorHub360", subheadline: "Check in or apply to become a member." },
  { headline: "Ready to Collaborate?", subheadline: "Check in to connect with creators, brands, and agencies." },
  { headline: "Welcome Back!", subheadline: "Scan your member QR code to check in." },
  { headline: "Check In Below", subheadline: "It only takes a few seconds." },
];

const WELCOME_ROTATE_MS = 9000;

function useRotatingWelcome(enabled: boolean) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % WELCOME_ROTATION.length), WELCOME_ROTATE_MS);
    return () => clearInterval(interval);
  }, [enabled]);
  return WELCOME_ROTATION[index];
}

type Sponsor = { name: string; logoUrl: string; message?: string; ctaLabel?: string; ctaLink?: string };

export function HomeScreen({
  kioskName,
  kioskLocation,
  isEntrance,
  onCheckIn,
  onRegisterNow,
  theme,
  announcements,
  enabledSections,
  featuredEvent,
}: {
  kioskName: string;
  kioskLocation: string | null;
  isEntrance: boolean;
  onCheckIn: () => void;
  onRegisterNow: () => void;
  /** Currently-resolved theme (see kiosk-theme-resolution.service.ts) — null only in the
   * defensive case where no theme exists at all yet (brand-new org, pre-seed). */
  theme?: ResolvedKioskTheme | null;
  announcements?: KioskAnnouncementCard[];
  enabledSections?: Set<string>;
  /** Built-in fallback promotion — only rendered when no richer authored theme is live. */
  featuredEvent?: KioskFeaturedEvent | null;
}) {
  const showHero = enabledSections?.has("HERO") ?? true;
  const showAnnouncements = (enabledSections?.has("ANNOUNCEMENTS") ?? true) && (announcements?.length ?? 0) > 0;
  const showSponsors = enabledSections?.has("SPONSORS") ?? true;
  const showCheckIn = enabledSections?.has("QR_CHECKIN") ?? true;
  const showRegister = enabledSections?.has("REGISTER_NOW") ?? true;

  // "Ready to Collaborate? / Today's Event Starts at 6 PM / ..." — only rotates on the
  // evergreen/default screen; a real event theme keeps its own authored copy front and center.
  const isThemed = Boolean(theme && !theme.isDefault);
  const rotatingWelcome = useRotatingWelcome(isEntrance && !isThemed);
  const headline = isThemed ? null : isEntrance ? rotatingWelcome.headline : kioskLocation;
  const subheadline = isThemed ? null : isEntrance ? rotatingWelcome.subheadline : "Scan to enter or exit.";

  const sponsors = useMemo(() => (Array.isArray(theme?.sponsors) ? (theme!.sponsors as Sponsor[]) : []), [theme]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex w-full max-w-4xl flex-col items-center gap-6 text-center sm:gap-8"
    >
      {showHero &&
        (isThemed && theme ? (
          <KioskHero theme={theme} />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:gap-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
            >
              <LogoMark size="xl" variant="light" />
            </motion.div>

            <div className="space-y-3 px-2">
              <p className="text-sm font-medium tracking-[0.2em] text-black/40 uppercase">{kioskName}</p>
              <h1 className="text-4xl font-semibold tracking-tight text-balance text-black sm:text-6xl lg:text-7xl">
                {headline}
              </h1>
              <p className="text-lg text-black/50 text-balance sm:text-2xl">{subheadline}</p>
            </div>
          </div>
        ))}

      {!isThemed && featuredEvent && <KioskFeaturedEventBanner event={featuredEvent} />}

      {/* Action cards — always both present in the DOM position regardless of theme;
          check-in/register must keep working exactly as before ("Do not break existing
          kiosk functionality") no matter what's happening above. */}
      {(showCheckIn || showRegister) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
          className={`-mt-2 grid w-full max-w-[270px] grid-cols-1 gap-2.5 sm:-mt-4 sm:gap-3 ${showCheckIn && showRegister ? "sm:max-w-[380px] sm:grid-cols-2" : ""}`}
        >
          {showRegister && (
            <button
              type="button"
              onClick={onRegisterNow}
              className="group relative flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-3xl border border-black/10 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.08)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_30px_60px_-20px_rgba(0,0,0,0.15)] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              <span className="flex size-7 items-center justify-center rounded-xl bg-black/[0.03] text-black transition-colors duration-300 group-hover:bg-black group-hover:text-white">
                <UserPlus className="size-3.5" />
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-base font-semibold tracking-tight text-black">Register</span>
                <span className="text-xs text-black/50">Become a Member</span>
              </span>
              <span className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-black/40 opacity-0 transition-all duration-200 -translate-y-1 group-hover:translate-y-0 group-hover:opacity-100">
                Continue <ArrowRight className="size-3" />
              </span>
            </button>
          )}

          {showCheckIn && (
            <button
              type="button"
              onClick={onCheckIn}
              className="group relative flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-3xl border border-black/10 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.08)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_30px_60px_-20px_rgba(0,0,0,0.15)] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
            >
              <span className="flex size-7 items-center justify-center rounded-xl bg-black/[0.03] text-black transition-colors duration-300 group-hover:bg-black group-hover:text-white">
                <QrCode className="size-3.5" />
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-base font-semibold tracking-tight text-black">
                  {isEntrance ? "Check In" : "Scan QR Code"}
                </span>
                <span className="text-xs text-black/50">Scan your QR Code</span>
              </span>
              <span className="absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-black/40 opacity-0 transition-all duration-200 -translate-y-1 group-hover:translate-y-0 group-hover:opacity-100">
                Continue <ArrowRight className="size-3" />
              </span>
            </button>
          )}
        </motion.div>
      )}

      {showAnnouncements && <KioskRotatingAnnouncements announcements={announcements ?? []} />}

      {showSponsors && sponsors.length > 0 && <KioskSponsorSection sponsors={sponsors} />}

      {!isThemed && isEntrance && kioskLocation && (
        <p className="text-xs tracking-[0.2em] text-black/30 uppercase">{kioskLocation}</p>
      )}
    </motion.div>
  );
}
