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

  // Opt-in per theme (see BasicInfoSection's "Themed Action Buttons" toggle) — every existing
  // theme defaults to false, so the Check In / Register cards stay their current neutral white
  // unless a theme explicitly asks to recolor them with its own buttonColor/buttonTextColor.
  const useThemedButtons = Boolean(isThemed && theme?.themedActionButtons && theme.buttonColor);
  const themedCardVars = useThemedButtons
    ? ({
        "--kiosk-btn-bg": theme!.buttonColor as string,
        "--kiosk-btn-text": theme!.buttonTextColor || "#ffffff",
      } as React.CSSProperties)
    : undefined;
  const cardClass = useThemedButtons
    ? "group relative flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-3xl border border-[var(--kiosk-btn-text)]/15 bg-[var(--kiosk-btn-bg)] px-3.5 py-2.5 text-[var(--kiosk-btn-text)] shadow-[0_1px_2px_rgba(0,0,0,0.06),0_20px_50px_-20px_rgba(0,0,0,0.18)] outline-none transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-[var(--kiosk-btn-bg)]/30 focus-visible:ring-offset-4"
    : "group relative flex min-h-11 flex-col items-center justify-center gap-1.5 rounded-3xl border border-black/10 bg-white px-3.5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.08)] outline-none transition-all duration-300 hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_1px_2px_rgba(0,0,0,0.06),0_30px_60px_-20px_rgba(0,0,0,0.15)] active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white";
  const iconBoxClass = useThemedButtons
    ? "flex size-7 items-center justify-center rounded-xl bg-[var(--kiosk-btn-text)]/15 text-[var(--kiosk-btn-text)]"
    : "flex size-7 items-center justify-center rounded-xl bg-black/[0.03] text-black transition-colors duration-300 group-hover:bg-black group-hover:text-white";
  const cardTitleClass = useThemedButtons ? "text-base font-semibold tracking-tight" : "text-base font-semibold tracking-tight text-black";
  const cardSubtitleClass = useThemedButtons ? "text-xs text-[var(--kiosk-btn-text)]/70" : "text-xs text-black/50";
  const cardHintClass = useThemedButtons
    ? "absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-[var(--kiosk-btn-text)]/70 opacity-0 transition-all duration-200 -translate-y-1 group-hover:translate-y-0 group-hover:opacity-100"
    : "absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1 text-[11px] font-medium text-black/40 opacity-0 transition-all duration-200 -translate-y-1 group-hover:translate-y-0 group-hover:opacity-100";

  // Same opt-in signal as useThemedButtons — a theme rich enough to define its own kioskTitle
  // (a dedicated page-title tier) is exactly the kind of branded event that also wants its own
  // elevated card rather than sitting flat on the page background. No kioskTitle means no card,
  // so every theme authored before this existed renders exactly as it did before.
  const useHeroCard = Boolean(isThemed && theme?.kioskTitle);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={
        useHeroCard
          ? "flex w-full max-w-xl flex-col items-center gap-6 rounded-[2.5rem] bg-[#FDF8F6]/95 px-6 py-10 text-center shadow-[0_1px_2px_rgba(74,59,56,0.04),0_30px_70px_-25px_rgba(74,59,56,0.18)] backdrop-blur-sm sm:gap-8 sm:px-12 sm:py-14"
          : "flex w-full max-w-4xl flex-col items-center gap-6 text-center sm:gap-8"
      }
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
            <button type="button" onClick={onRegisterNow} className={cardClass} style={themedCardVars}>
              <span className={iconBoxClass}>
                <UserPlus className="size-3.5" />
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span className={cardTitleClass}>Register</span>
                <span className={cardSubtitleClass}>Become a Member</span>
              </span>
              <span className={cardHintClass}>
                Continue <ArrowRight className="size-3" />
              </span>
            </button>
          )}

          {showCheckIn && (
            <button type="button" onClick={onCheckIn} className={cardClass} style={themedCardVars}>
              <span className={iconBoxClass}>
                <QrCode className="size-3.5" />
              </span>
              <span className="flex flex-col items-center gap-0.5">
                <span className={cardTitleClass}>{isEntrance ? "Check In" : "Scan QR Code"}</span>
                <span className={cardSubtitleClass}>Scan your QR Code</span>
              </span>
              <span className={cardHintClass}>
                Continue <ArrowRight className="size-3" />
              </span>
            </button>
          )}
        </motion.div>
      )}

      {showAnnouncements && <KioskRotatingAnnouncements announcements={announcements ?? []} />}

      {showSponsors && sponsors.length > 0 && <KioskSponsorSection sponsors={sponsors} />}

      {/* "Check-in messaging" — theme-authored footer beneath the action cards (see
          BasicInfoSection's Check-In Message field). Only shown for a real authored theme; the
          evergreen default screen keeps its existing kioskLocation footer below instead. */}
      {isThemed && theme?.checkInMessage && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-md text-sm text-balance opacity-70"
          style={theme.textColor ? { color: theme.textColor } : undefined}
        >
          {theme.checkInMessage}
        </motion.p>
      )}

      {!isThemed && isEntrance && kioskLocation && (
        <p className="text-xs tracking-[0.2em] text-black/30 uppercase">{kioskLocation}</p>
      )}
    </motion.div>
  );
}
