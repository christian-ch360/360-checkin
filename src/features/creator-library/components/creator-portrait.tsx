import { cn } from "@/lib/utils";
import { creatorGradient, creatorInitials } from "@/features/creator-library/lib/placeholder";

/**
 * Creator image with a branded fallback (spec §9, §22). Real photo when one
 * exists; otherwise a deterministic gradient + initials + a subtle CH360 mark
 * — never an AI-generated face. Plain lazy <img> to match the app convention
 * (no next/image remotePatterns configured) and satisfy §26's lazy-loading
 * requirement.
 */
export function CreatorPortrait({
  name,
  imageUrl,
  seed,
  className,
  rounded = "rounded-2xl",
  priority = false,
}: {
  name: string;
  imageUrl: string | null;
  seed: string;
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
      <span className="absolute bottom-2 right-2.5 text-[0.6rem] font-semibold tracking-[0.2em] text-white/45 uppercase">
        CH360
      </span>
      <span
        aria-hidden
        className="absolute -left-6 -top-6 size-24 rounded-full bg-white/10 blur-xl"
      />
    </div>
  );
}
