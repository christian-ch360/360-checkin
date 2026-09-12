import { cn } from "@/lib/utils";
import { C360_STATUS } from "@/features/creator-library/config/library-config";

/**
 * Spec §18 — a distinct CreatorHub360 identity marker, deliberately NOT a
 * generic social "verified" checkmark. The mark is a small filled hexagon
 * with "360" — unique to this network — and Verified members get the accented
 * treatment.
 */
export function C360StatusBadge({
  verified,
  className,
  size = "md",
}: {
  verified: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const meta = verified ? C360_STATUS.verified : C360_STATUS.network;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium uppercase",
        size === "sm" ? "px-2 py-0.5 text-[0.6rem] tracking-[0.16em]" : "px-2.5 py-1 text-[0.65rem] tracking-[0.18em]",
        verified
          ? "border-[#E8D5A3] bg-[#FBF3DE] text-[#8A6A2E]"
          : "border-[#EAE1CB] bg-[#F5F1E8] text-[#6B6B6B]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-3.5 place-items-center text-[0.5rem] font-bold leading-none text-white",
          verified ? "bg-[#D4AF6A]" : "bg-[#6B6B6B]",
        )}
        style={{ clipPath: "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)" }}
      >
        3
      </span>
      {meta.label}
    </span>
  );
}
