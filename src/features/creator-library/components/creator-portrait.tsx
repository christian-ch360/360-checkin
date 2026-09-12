import { cn } from "@/lib/utils";
import { creatorGradient, creatorInitials } from "@/features/creator-library/lib/placeholder";

/**
 * Creator image with a branded fallback (spec §9, §22). Real photo when one
 * exists. Otherwise: the org's uploaded Card Placeholder Icon when Ops has
 * set one (Creator Library Settings), else the deterministic gradient +
 * initials mark — never an AI-generated face. Plain lazy <img> to match the
 * app convention (no next/image remotePatterns configured) and satisfy
 * §26's lazy-loading requirement.
 */
export function CreatorPortrait({
  name,
  imageUrl,
  seed,
  placeholderIconUrl,
  className,
  rounded = "rounded-2xl",
  priority = false,
}: {
  name: string;
  imageUrl: string | null;
  seed: string;
  /** Org-level Card Placeholder Icon (Creator Library Settings) — used when the creator has no photo. */
  placeholderIconUrl?: string | null;
  className?: string;
  rounded?: string;
  priority?: boolean;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Supabase/creator URL; app has no next/image remotePatterns and uses <img> for these everywhere
      <img
        src={imageUrl}
        alt={name}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cn("size-full object-cover", rounded, className)}
      />
    );
  }

  if (placeholderIconUrl) {
    return (
      <div
        className={cn("relative flex size-full items-center justify-center overflow-hidden bg-muted", rounded, className)}
        role="img"
        aria-label={`${name} — no photo provided`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- org-uploaded icon (PNG/SVG), same remote-URL convention as photos */}
        <img src={placeholderIconUrl} alt="" loading={priority ? "eager" : "lazy"} className="size-2/5 object-contain opacity-70" />
      </div>
    );
  }

  const gradient = creatorGradient(seed);

  return (
    <div
      className={cn("relative flex size-full items-center justify-center overflow-hidden", rounded, className)}
      style={{ background: gradient.css }}
      role="img"
      aria-label={`${name} — no photo provided`}
    >
      <span className="text-[clamp(1.75rem,7vw,3.5rem)] font-semibold tracking-tight text-white/90">
        {creatorInitials(name)}
      </span>
      <span className="absolute bottom-2 right-2.5 text-[0.55rem] font-semibold tracking-[0.08em] text-white/45 uppercase">
        CreatorHub360
      </span>
      <span
        aria-hidden
        className="absolute -left-6 -top-6 size-24 rounded-full bg-white/10 blur-xl"
      />
    </div>
  );
}
