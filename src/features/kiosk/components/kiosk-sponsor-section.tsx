"use client";

import { motion } from "framer-motion";

type Sponsor = { name: string; logoUrl: string; message?: string; ctaLabel?: string; ctaLink?: string };

/** "Sponsor Support — Today's Event Sponsored By ... Display: Logo, Short message, CTA." */
export function KioskSponsorSection({ sponsors }: { sponsors: Sponsor[] }) {
  if (sponsors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      className="flex w-full max-w-4xl flex-col items-center gap-4"
    >
      <p className="text-xs font-medium tracking-[0.2em] text-black/40 uppercase">Today&apos;s Event Sponsored By</p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {sponsors.map((sponsor) => (
          <div
            key={sponsor.name}
            className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-5 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied arbitrary logo URLs */}
            <img src={sponsor.logoUrl} alt={sponsor.name} className="h-8 w-auto max-w-24 object-contain" />
            <div className="text-left">
              <p className="text-sm font-medium text-black">{sponsor.name}</p>
              {sponsor.message && <p className="text-xs text-black/50">{sponsor.message}</p>}
            </div>
            {sponsor.ctaLabel && sponsor.ctaLink && (
              <a
                href={sponsor.ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-xs font-medium text-black underline underline-offset-2"
              >
                {sponsor.ctaLabel}
              </a>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
