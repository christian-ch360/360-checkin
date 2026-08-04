"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { KioskDecorativeElement } from "@prisma/client";
import {
  KIOSK_DECORATIVE_ELEMENTS,
  type DecorativeEffectKind,
} from "@/features/kiosk/config/kiosk-decorative-elements.config";

type ThemeColor = { name: string; hex: string };

/** Deterministic pseudo-randomness keyed by index — avoids SSR/client hydration mismatches that Math.random() in render would cause. */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 999.7) * 10000;
  return x - Math.floor(x);
}

function ParticleField({ count, sprite, color, mode }: { count: number; sprite: string; color: string; mode: "fall" | "float" | "drift" }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: pseudoRandom(i + 1) * 100,
        delay: pseudoRandom(i + 20) * 6,
        duration: 6 + pseudoRandom(i + 40) * 6,
        size: 0.7 + pseudoRandom(i + 60) * 0.9,
        drift: (pseudoRandom(i + 80) - 0.5) * 40,
      })),
    [count]
  );

  return (
    <>
      {particles.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute select-none"
          style={{ left: `${p.left}%`, fontSize: `${p.size}rem`, color, top: mode === "fall" ? "-10%" : undefined, bottom: mode !== "fall" ? "-10%" : undefined }}
          initial={mode === "fall" ? { y: "-10%", opacity: 0 } : { y: "0%", opacity: 0 }}
          animate={
            mode === "fall"
              ? { y: "110%", x: [0, p.drift, 0], opacity: [0, 1, 1, 0] }
              : { y: "-120%", x: [0, p.drift, 0], opacity: [0, 1, 1, 0] }
          }
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
        >
          {sprite}
        </motion.span>
      ))}
    </>
  );
}

function TwinkleField({ count, color }: { count: number; color: string }) {
  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: pseudoRandom(i + 100) * 100,
        top: pseudoRandom(i + 120) * 30,
        delay: pseudoRandom(i + 140) * 3,
      })),
    [count]
  );
  return (
    <>
      {dots.map((d, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute size-1.5 rounded-full"
          style={{ left: `${d.left}%`, top: `${d.top}%`, backgroundColor: color, boxShadow: `0 0 8px 2px ${color}` }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 2, delay: d.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function GlowWash({ color }: { color: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{ background: `radial-gradient(ellipse at 50% 30%, ${color}55 0%, transparent 65%)` }}
    />
  );
}

const EFFECT_DEFAULT_COLOR: Record<DecorativeEffectKind, string> = {
  "particles-fall": "#ffffff",
  "particles-float": "#ffffff",
  twinkle: "#ffe08a",
  glow: "#b45309",
  "sprite-drift": "#ffffff",
};

/**
 * Renders a theme's selected decorativeElements as generic, theme-tinted
 * ambient effects behind/over the hero content — see
 * kiosk-decorative-elements.config.ts for the closed catalog. Pointer-events
 * are disabled throughout so it never interferes with the CTA/QR button.
 */
export function KioskDecorativeLayer({
  elements,
  themeColors,
}: {
  elements: KioskDecorativeElement[];
  themeColors?: ThemeColor[] | null;
}) {
  if (elements.length === 0) return null;
  const palette = (themeColors ?? []).map((c) => c.hex).filter(Boolean);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {elements.map((key, idx) => {
        const def = KIOSK_DECORATIVE_ELEMENTS[key];
        if (!def) return null;
        const color = palette[idx % palette.length] ?? EFFECT_DEFAULT_COLOR[def.effect];

        switch (def.effect) {
          case "particles-fall":
            return <ParticleField key={key} count={14} sprite={def.sprite ?? "•"} color={color} mode="fall" />;
          case "particles-float":
            return <ParticleField key={key} count={10} sprite={def.sprite ?? "•"} color={color} mode="float" />;
          case "sprite-drift":
            return <ParticleField key={key} count={6} sprite={def.sprite ?? "•"} color={color} mode="drift" />;
          case "twinkle":
            return <TwinkleField key={key} count={16} color={color} />;
          case "glow":
            return <GlowWash key={key} color={color} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
