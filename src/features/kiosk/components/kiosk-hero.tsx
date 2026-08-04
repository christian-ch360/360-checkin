"use client";

import { useEffect, useMemo } from "react";
import { motion, type TargetAndTransition } from "framer-motion";
import { CalendarDays, Clock, MapPin, Megaphone } from "lucide-react";
import type { KioskDecorativeElement } from "@prisma/client";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import { recordKioskInteractionAction } from "@/features/kiosk/services/kiosk-analytics-actions";
import { useCountdown } from "@/features/kiosk/hooks/use-countdown";
import { KioskDecorativeLayer } from "@/features/kiosk/components/kiosk-decorative-layer";
import { LogoMark } from "@/features/auth/components/logo-mark";

const ANIMATION_VARIANTS: Record<string, { initial: TargetAndTransition; animate: TargetAndTransition }> = {
  FADE: { initial: { opacity: 0 }, animate: { opacity: 1 } },
  SLIDE: { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 } },
  ZOOM: { initial: { opacity: 0, scale: 0.94 }, animate: { opacity: 1, scale: 1 } },
  NONE: { initial: { opacity: 1 }, animate: { opacity: 1 } },
};

function formatDateLabel(date: Date): string {
  const today = new Date();
  const isSameDay = date.toDateString() === today.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (isSameDay) return "Tonight";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

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
  const variant = ANIMATION_VARIANTS[theme.animationStyle] ?? ANIMATION_VARIANTS.FADE;
  const dateLabel = formatDateLabel(theme.startDate);
  const timeLabel = formatTimeRange(theme.startTime, theme.endTime);
  // Countdown target is the event's actual start instant — startDate alone is midnight, which
  // (for a same-day evening event) has already passed by the time anyone would see this.
  const countdownTarget = useMemo(() => {
    if (!theme.showCountdown) return null;
    const target = new Date(theme.startDate);
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
  const cta = buttonClassAndStyle(theme);
  const decorativeElements = (theme.decorativeElements ?? []) as KioskDecorativeElement[];
  const themeColors = Array.isArray(theme.themeColors) ? (theme.themeColors as { name: string; hex: string }[]) : null;

  useEffect(() => {
    recordKioskInteractionAction("THEME_VIEW", { themeKey: theme.themeKey });
  }, [theme.themeKey]);

  return (
    <motion.div
      initial={variant.initial}
      animate={variant.animate}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="relative flex w-full max-w-4xl flex-col items-center gap-6 overflow-hidden rounded-[40px] px-6 py-14 text-center sm:gap-8 sm:px-12 sm:py-20"
    >
      {hasImageBackground && (
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          {theme.backgroundVideoUrl ? (
            <video
              src={theme.backgroundVideoUrl}
              poster={theme.backgroundImageUrl ?? undefined}
              className="size-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- kiosk background is admin-supplied, arbitrary remote URLs
            <img src={theme.backgroundImageUrl!} alt="" className="size-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
        </div>
      )}
      {hasColorBackground && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `linear-gradient(160deg, ${theme.primaryColor}, ${theme.secondaryColor || theme.primaryColor})`,
          }}
        />
      )}

      <KioskDecorativeLayer elements={decorativeElements} themeColors={themeColors} />

      {theme.promoBannerText && (
        <a
          href={theme.promoBannerLink || undefined}
          target={theme.promoBannerLink ? "_blank" : undefined}
          rel={theme.promoBannerLink ? "noopener noreferrer" : undefined}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${hasBackground ? "bg-white/15 text-white backdrop-blur-sm" : "bg-black/[0.04]"} ${theme.promoBannerLink ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
        >
          <Megaphone className="size-3.5" /> {theme.promoBannerText}
        </a>
      )}

      {theme.logoVariant !== "DEFAULT" && theme.logoVariant !== "HIDDEN" && (
        <div className="relative">
          {theme.logoVariant === "CUSTOM" && theme.logoOverrideUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied logo override
            <img src={theme.logoOverrideUrl} alt="" className="h-10 w-auto object-contain" />
          ) : (
            <LogoMark size="md" variant={theme.logoVariant === "LIGHT" ? "light" : "dark"} />
          )}
        </div>
      )}

      <div className={`relative space-y-4 px-2 ${hasBackground ? "text-white" : ""}`} style={hasBackground ? undefined : textStyle}>
        {(dateLabel || timeLabel) && (
          <p className="flex items-center justify-center gap-2 text-sm font-medium tracking-[0.2em] uppercase opacity-80">
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
          className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl"
          style={hasBackground ? undefined : accentStyle}
        >
          {theme.headline}
        </h1>
        {theme.subheadline && <p className="text-lg text-balance opacity-80 sm:text-2xl">{theme.subheadline}</p>}
        {(theme.featuredEventTitle || theme.location) && (
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm opacity-70">
            {theme.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" /> {theme.location}
              </span>
            )}
          </p>
        )}
        {theme.featuredEventTags.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {theme.featuredEventTags.map((tag) => (
              <span
                key={tag}
                className={`rounded-full px-3 py-1 text-xs font-medium ${hasBackground ? "bg-white/15 text-white backdrop-blur-sm" : "bg-black/[0.04]"}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {countdown && (
        <div className={`relative flex items-center gap-4 rounded-2xl px-6 py-3 ${hasBackground ? "bg-white/10 text-white backdrop-blur-sm" : "bg-black/[0.03]"}`}>
          {[
            { label: "hrs", value: countdown.hours },
            { label: "min", value: countdown.minutes },
            { label: "sec", value: countdown.seconds },
          ].map((unit) => (
            <div key={unit.label} className="flex flex-col items-center gap-0.5">
              <span className="font-mono text-2xl font-semibold tabular-nums sm:text-3xl">{String(unit.value).padStart(2, "0")}</span>
              <span className="text-[10px] font-medium tracking-widest uppercase opacity-60">{unit.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex flex-wrap items-center justify-center gap-4">
        {theme.ctaLabel && theme.ctaLink && (
          <a
            href={theme.ctaLink}
            onClick={() => recordKioskInteractionAction("CTA_CLICK", { themeKey: theme.themeKey })}
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
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${hasBackground ? "bg-white/10 text-white backdrop-blur-sm" : "bg-black/[0.03]"}`}
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
    </motion.div>
  );
}
