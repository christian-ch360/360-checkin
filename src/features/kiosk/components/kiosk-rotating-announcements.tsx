"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone } from "lucide-react";

export type KioskAnnouncementCard = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
};

const ROTATE_MS = 6000;

/** "Rotating Announcements — Rotate every few seconds." One card visible at a time, cross-fading
 * on a fixed interval; pauses cleanly (no dangling timer) when there's only one card or none. */
export function KioskRotatingAnnouncements({ announcements }: { announcements: KioskAnnouncementCard[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % announcements.length), ROTATE_MS);
    return () => clearInterval(interval);
  }, [announcements.length]);

  if (announcements.length === 0) return null;
  const current = announcements[index % announcements.length];

  return (
    <div className="w-full max-w-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-4 rounded-3xl border border-black/10 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_20px_50px_-20px_rgba(0,0,0,0.08)]"
        >
          {current.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary image URLs
            <img src={current.imageUrl} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
          ) : (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-black/[0.03] text-black/40">
              <Megaphone className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-base font-semibold text-black">{current.title}</p>
            {current.description && <p className="truncate text-sm text-black/50">{current.description}</p>}
          </div>
          {current.ctaLabel && current.ctaLink && (
            <a
              href={current.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full border border-black/10 px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-black/[0.03]"
            >
              {current.ctaLabel}
            </a>
          )}
        </motion.div>
      </AnimatePresence>
      {announcements.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {announcements.map((a, i) => (
            <span
              key={a.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index % announcements.length ? "w-5 bg-black/60" : "w-1.5 bg-black/15"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
