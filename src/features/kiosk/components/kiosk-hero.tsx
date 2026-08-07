"use client";

import { useEffect, useMemo } from "react";
import { motion, type TargetAndTransition } from "framer-motion";
import { CalendarDays, Clock, MapPin, Megaphone, ParkingCircle } from "lucide-react";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import { recordKioskInteractionAction } from "@/features/kiosk/services/kiosk-analytics-actions";
import { useCountdown } from "@/features/kiosk/hooks/use-countdown";
import { LogoMark } from "@/features/auth/components/logo-mark";
import { cn } from "@/lib/utils";
import { useKioskPreview, useKioskNow } from "@/features/kiosk/context/kiosk-preview-context";
import { formatDateLabel } from "@/features/kiosk/config/kiosk-schedule";
import { KIOSK_HERO_SIZE_DEFAULTS } from "@/features/kiosk/config/kiosk-hero-sizing.config";

const ANIMATION_VARIANTS: Record<string, { initial: TargetAndTransition; animate: TargetAndTransition }> = {
  FADE: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  SLIDE: { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } },
  ZOOM: { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 } },
  NONE: { initial: { opacity: 1 }, animate: { opacity: 1 } },
};

function formatTimeRange(startTime: string | null, endTime: string | null): string | null {
  if (!startTime && !endTime) return null;
  const format12h = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour12}:00 ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };
  if (startTime && endTime) return `${format12h(startTime)} – ${format12h(endTime)}`;
  return format12h(startTime ?? endTime!);
}

/**
 * Container-relative fluid sizing for the Hero's theme-configurable logo/type
 * sizes: the admin's chosen px value applies exactly at a 1200px-wide
 * container (a full kiosk/desktop display) and scales down proportionally on
 * narrower containers (Tablet/Kiosk/Mobile Theme Editor previews, and real
 * narrow-screen kiosks), floored so it never becomes illegible. Relies on the
 * `container-type: inline-size` set on KioskChrome, which both the live
 * kiosk (sized to the real viewport) and the Theme Editor's device preview
 * frames already establish.
 */
function fluidPx(px: number): string {
  const min = Math.round(px * 0.45);
  return `clamp(${min}px, ${(px / 12).toFixed(2)}cqw, ${px}px)`;
}

/** Button appearance driven by theme.buttonStyle — the same 4 styles the Theme Editor offers. */
function buttonClassAndStyle(theme: ResolvedKioskTheme): { className: string; style: React.CSSProperties } {
  const bg = theme.buttonColor || "#000000";
  const text = theme.buttonTextColor || "#ffffff";
  switch (theme.buttonStyle) {
    case "OUTLINE":
      return {
        className: "border-2 bg-transparent",
        style: { borderColor: bg, color: theme.buttonTextColor || bg },
      };
    case "GLASS":
      return {
        className: "border border-white/30 bg-white/15 backdrop-blur-md",
        style: { color: theme.buttonTextColor || "#ffffff" },
      };
    case "GRADIENT":
      return {
        className: "border-0",
        style: {
          backgroundImage: `linear-gradient(135deg, ${theme.primaryColor || bg}, ${theme.secondaryColor || theme.accentColor || bg})`,
          color: text,
        },
      };
    case "SOLID":
    default:
      return { className: "border-0", style: { backgroundColor: bg, color: text } };
  }
}

/**
 * "Event Hero Banner" — replaces the standard welcome header whenever a
 * non-default theme is currently resolved as active. Deliberately never
 * touches the Check In / Register action cards rendered beneath it in
 * HomeScreen — those stay identical regardless of which theme is live.
 */
export function KioskHero({ theme }: { theme: ResolvedKioskTheme }) {
  const { isPreview } = useKioskPreview();
  const now = useKioskNow();
  const variant = ANIMATION_VARIANTS[theme.animationStyle] ?? ANIMATION_VARIANTS.FADE;
  const dateLabel = formatDateLabel(theme.startDate, now);
  const timeLabel = formatTimeRange(theme.startTime, theme.endTime);
  // Countdown target is the event's actual start instant — startDate alone is midnight, which
  // (for a same-day evening event) has already passed by the time anyone would see this.
  // Read startDate's calendar day via UTC accessors (see formatDateLabel above), then build a
  // LOCAL Date from those same day/month/year components before layering startTime on top —
  // `new Date(theme.startDate)` + local setHours() would silently re-derive the local calendar
  // day of the UTC-midnight instant, landing the countdown on the wrong day in any timezone
  // behind UTC.
  const countdownTarget = useMemo(() => {
    if (!theme.showCountdown) return null;
    const target = new Date(
      theme.startDate.getUTCFullYear(),
      theme.startDate.getUTCMonth(),
      theme.startDate.getUTCDate()
    );
    if (theme.startTime) {
      const [h, m] = theme.startTime.split(":").map(Number);
      target.setHours(h, m, 0, 0);
    }
    return target;
  }, [theme.showCountdown, theme.startDate, theme.startTime]);
  const countdown = useCountdown(countdownTarget);
  const accentStyle = theme.accentColor ? { color: theme.accentColor } : undefined;
  const textStyle = theme.textColor ? { color: theme.textColor } : undefined;
  const hasImageBackground = Boolean(theme.backgroundImageUrl || theme.backgroundVideoUrl);
  // Themes are routinely published with colors but no uploaded photo/video yet — without this
  // fallback, a light theme.textColor (chosen assuming a dark photo) renders unreadable against
  // the kiosk's plain page background. A primaryColor gradient stands in as the "photo" so the
  // same dark-overlay/light-text treatment always has something to sit on.
  const hasColorBackground = !hasImageBackground && Boolean(theme.primaryColor);
  const hasBackground = hasImageBackground || hasColorBackground;
  // Only fall back to hardcoded white when the theme has a background but no
  // explicit textColor of its own — themes that configure both a background
  // and a text color (e.g. a light gold background with dark text) get to
  // keep their own contrast choice instead of being forced to white.
  const forceWhiteText = hasBackground && !theme.textColor;
  const cta = buttonClassAndStyle(theme);
  const logoSize = theme.heroLogoSize ?? KIOSK_HERO_SIZE_DEFAULTS.logoSize;
  const titleSize = theme.heroTitleSize ?? KIOSK_HERO_SIZE_DEFAULTS.titleSize;
  const subtitleSize = theme.heroSubtitleSize ?? KIOSK_HERO_SIZE_DEFAULTS.subtitleSize;
  const dateTimeSize = theme.heroDateTimeSize ?? KIOSK_HERO_SIZE_DEFAULTS.dateTimeSize;
  const locationSize = theme.heroLocationSize ?? KIOSK_HERO_SIZE_DEFAULTS.locationSize;
  const countdownSize = theme.heroCountdownSize ?? KIOSK_HERO_SIZE_DEFAULTS.countdownSize;

  useEffect(() => {
    if (isPreview) return;
    recordKioskInteractionAction("THEME_VIEW", { themeKey: theme.themeKey });
  }, [theme.themeKey, isPreview]);

  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-10 text-center sm:gap-8 sm:px-12 sm:py-14"
    >
      {theme.promoBannerText && (
        <a
          href={theme.promoBannerLink || undefined}
          target={theme.promoBannerLink ? "_blank" : undefined}
          rel={theme.promoBannerLink ? "noopener noreferrer" : undefined}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium",
            hasBackground ? "bg-white/15 backdrop-blur-sm" : "bg-black/[0.04]",
            forceWhiteText && "text-white",
            theme.promoBannerLink ? "cursor-pointer hover:opacity-80" : "cursor-default"
          )}
          style={forceWhiteText ? undefined : textStyle}
        >
          <Megaphone className="size-3.5" /> {theme.promoBannerText}
        </a>
      )}

      {theme.logoVariant !== "DEFAULT" && theme.logoVariant !== "HIDDEN" && (
        <div className="relative">
          {theme.logoVariant === "CUSTOM" && theme.logoOverrideUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied logo override
            <img
              src={theme.logoOverrideUrl}
              alt=""
              className="w-auto object-contain"
              style={{ height: fluidPx(logoSize) }}
            />
          ) : (
            <LogoMark
              size="xl"
              variant={theme.logoVariant === "LIGHT" ? "light" : "dark"}
              style={{ width: fluidPx(logoSize), height: fluidPx(logoSize) }}
            />
          )}
        </div>
      )}

      <div className={cn("relative space-y-4 px-2", forceWhiteText && "text-white")} style={forceWhiteText ? undefined : textStyle}>
        {(dateLabel || timeLabel) && (
          <p
            className="flex items-center justify-center gap-2 font-medium tracking-[0.2em] uppercase opacity-80"
            style={{ fontSize: fluidPx(dateTimeSize) }}
          >
            {dateLabel && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> {dateLabel}
              </span>
            )}
            {timeLabel && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> {timeLabel}
              </span>
            )}
          </p>
        )}
        <h1
          className="font-semibold tracking-tight text-balance"
          style={{ fontSize: fluidPx(titleSize), ...(hasBackground ? undefined : accentStyle) }}
        >
          {theme.headline}
        </h1>
        {theme.subheadline && (
          <p
            className="text-balance whitespace-pre-line opacity-80"
            style={{ fontSize: fluidPx(subtitleSize) }}
          >
            {theme.subheadline}
          </p>
        )}
        {(theme.featuredEventTitle || theme.location || theme.parkingInfo) && (
          <div className="mb-5 flex flex-col items-center gap-2" style={{ fontSize: fluidPx(locationSize) }}>
            {theme.location && (
              <p className="flex flex-wrap items-center justify-center gap-1.5 opacity-70">
                <MapPin className="size-3.5" /> {theme.location}
              </p>
            )}
            {theme.parkingInfo && (
              <p className="inline-flex items-start justify-center gap-1.5 text-center leading-relaxed font-medium opacity-70">
                <ParkingCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{theme.parkingInfo}</span>
              </p>
            )}
          </div>
        )}
        {theme.featuredEventTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {theme.featuredEventTags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  hasBackground ? "bg-white/15 backdrop-blur-sm" : "bg-black/[0.04]",
                  forceWhiteText && "text-white"
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {countdown && (
        <div
          className={cn(
            "relative flex items-center gap-4 rounded-2xl px-6 py-3",
            hasBackground ? "bg-white/10 backdrop-blur-sm" : "bg-black/[0.03]",
            forceWhiteText && "text-white"
          )}
          style={forceWhiteText ? undefined : textStyle}
        >
          {[
            { label: "hrs", value: countdown.hours },
            { label: "min", value: countdown.minutes },
            { label: "sec", value: countdown.seconds },
          ].map((unit) => (
            <div key={unit.label} className="flex flex-col items-center gap-0.5">
              <span className="font-mono font-semibold tabular-nums" style={{ fontSize: fluidPx(countdownSize) }}>
                {String(unit.value).padStart(2, "0")}
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase opacity-60">{unit.label}</span>
            </div>
          ))}
        </div>
      )}

      {((theme.ctaLabel && theme.ctaLink) || (theme.showQrRegistration && theme.qrToken)) && (
        <div className="relative flex flex-wrap items-center justify-center gap-4">
          {theme.ctaLabel && theme.ctaLink && (
            <a
              href={theme.ctaLink}
              onClick={(e) => {
                if (isPreview) {
                  e.preventDefault();
                  return;
                }
                recordKioskInteractionAction("CTA_CLICK", { themeKey: theme.themeKey });
              }}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex h-14 items-center justify-center rounded-2xl px-8 text-[15px] font-semibold shadow-[0_20px_50px_-20px_rgba(0,0,0,0.3)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${cta.className}`}
              style={cta.style}
            >
              {theme.ctaLabel}
            </a>
          )}

          {theme.showQrRegistration && theme.qrToken && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl px-4 py-3",
                hasBackground ? "bg-white/10 backdrop-blur-sm" : "bg-black/[0.03]",
                forceWhiteText && "text-white"
              )}
              style={forceWhiteText ? undefined : textStyle}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamically generated QR image, not an optimizable static asset */}
              <img src={`/api/qr/${theme.qrToken}`} alt="Scan to register" className="size-16 rounded-lg bg-white p-1" />
              <span className="text-left text-xs font-medium opacity-80">
                Scan to
                <br />
                Register
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
