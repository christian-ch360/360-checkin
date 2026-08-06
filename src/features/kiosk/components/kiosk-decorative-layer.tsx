"use client";

import { useEffect, useMemo, useState } from "react";
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
        top: pseudoRandom(i + 120) * 100,
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
      style={{ background: `radial-gradient(ellipse at 50% 20%, ${color}40 0%, transparent 60%)` }}
    />
  );
}

/** A handful of concurrent burst "slots", each launching a small rising trail then
 * exploding into a ring of sparks and fading — staggered + individually re-looping
 * so bursts keep appearing "every few seconds" across the whole sky rather than all
 * firing in lockstep. */
function FireworkField({ count, color }: { count: number; color: string }) {
  const bursts = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: 8 + pseudoRandom(i + 500) * 84,
        top: 6 + pseudoRandom(i + 520) * 38,
        delay: pseudoRandom(i + 540) * 5,
        cycle: 6 + pseudoRandom(i + 560) * 3,
      })),
    [count]
  );
  const sparks = useMemo(() => Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2), []);

  return (
    <>
      {bursts.map((b, i) => (
        <div key={i} aria-hidden="true" className="absolute" style={{ left: `${b.left}%`, top: `${b.top}%` }}>
          {/* launch trail */}
          <motion.span
            className="absolute size-1 rounded-full"
            style={{ backgroundColor: color, left: 0, top: 0 }}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: [60, 0], opacity: [0, 0.9, 0] }}
            transition={{ duration: 0.5, delay: Math.max(0, b.delay - 0.5), repeat: Infinity, repeatDelay: b.cycle + 0.6 }}
          />
          {/* explosion */}
          {sparks.map((angle, j) => (
            <motion.span
              key={j}
              className="absolute size-1 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 6px 1.5px ${color}` }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
              animate={{
                x: [0, Math.cos(angle) * 46],
                y: [0, Math.sin(angle) * 46],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.6],
              }}
              transition={{ duration: 1.1, delay: b.delay, repeat: Infinity, repeatDelay: b.cycle, ease: "easeOut" }}
            />
          ))}
        </div>
      ))}
    </>
  );
}

/** A few soft, slowly-swaying vertical light beams — pure CSS/opacity animation,
 * no per-instance randomness needed so it carries zero hydration risk. */
function LightRays({ color }: { color: string }) {
  const rayCount = 5;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ mixBlendMode: "screen" }}>
      {Array.from({ length: rayCount }, (_, i) => (
        <motion.div
          key={i}
          className="absolute top-[-15%] h-[130%] w-[8%] origin-top"
          style={{
            left: `${(i / (rayCount - 1)) * 100}%`,
            background: `linear-gradient(to bottom, ${color}30, transparent 70%)`,
            filter: "blur(14px)",
          }}
          animate={{ opacity: [0.15, 0.4, 0.15], rotate: [-3, 3, -3] }}
          transition={{ duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
        />
      ))}
    </div>
  );
}

const EFFECT_DEFAULT_COLOR: Record<DecorativeEffectKind, string> = {
  "particles-fall": "#ffffff",
  "particles-float": "#ffffff",
  twinkle: "#ffe08a",
  glow: "#b45309",
  "sprite-drift": "#ffffff",
  "firework-burst": "#ffe08a",
  "light-rays": "#ffe08a",
};

/** Baseline particle/spark counts, tuned for full-viewport coverage (not a small hero card). */
const EFFECT_COUNT: Partial<Record<DecorativeEffectKind, number>> = {
  "particles-fall": 32,
  "particles-float": 18,
  "sprite-drift": 10,
  twinkle: 26,
  "firework-burst": 3,
};

/**
 * Renders a theme's selected decorativeElements as generic, theme-tinted
 * ambient effects — see kiosk-decorative-elements.config.ts for the closed
 * catalog. Pointer-events are disabled throughout so it never interferes
 * with interactive controls. Mounts empty and fills in on the client only
 * (particle positions are pseudo-random, and float-string serialization
 * differs subtly between SSR and hydration at this volume of elements —
 * mounting after hydration sidesteps that entirely rather than fighting it).
 */
export function KioskDecorativeLayer({
  elements,
  themeColors,
}: {
  elements: KioskDecorativeElement[];
  themeColors?: ThemeColor[] | null;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || elements.length === 0) return null;
  const palette = (themeColors ?? []).map((c) => c.hex).filter(Boolean);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {elements.map((key, idx) => {
        const def = KIOSK_DECORATIVE_ELEMENTS[key];
        if (!def) return null;
        const color = palette[idx % palette.length] ?? EFFECT_DEFAULT_COLOR[def.effect];

        switch (def.effect) {
          case "particles-fall":
            return <ParticleField key={key} count={EFFECT_COUNT["particles-fall"]!} sprite={def.sprite ?? "•"} color={color} mode="fall" />;
          case "particles-float":
            return <ParticleField key={key} count={EFFECT_COUNT["particles-float"]!} sprite={def.sprite ?? "•"} color={color} mode="float" />;
          case "sprite-drift":
            return <ParticleField key={key} count={EFFECT_COUNT["sprite-drift"]!} sprite={def.sprite ?? "•"} color={color} mode="drift" />;
          case "twinkle":
            return <TwinkleField key={key} count={EFFECT_COUNT.twinkle!} color={color} />;
          case "glow":
            return <GlowWash key={key} color={color} />;
          case "firework-burst":
            return <FireworkField key={key} count={EFFECT_COUNT["firework-burst"]!} color={color} />;
          case "light-rays":
            return <LightRays key={key} color={color} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
