import { cn } from "@/lib/utils";

/**
 * "CH360 / CREATOR NETWORK" lockup. Deliberately typographic, not a logo
 * image — it reads as an editorial masthead rather than an app header.
 */
export function LibraryWordmark({
  className,
  tone = "default",
  size = "md",
  stacked = false,
}: {
  className?: string;
  tone?: "default" | "invert";
  size?: "sm" | "md" | "lg";
  /** Stack "CREATOR NETWORK" beneath "CH360" (masthead style) instead of inline. */
  stacked?: boolean;
}) {
  return (
    <span
      className={cn(
        "select-none",
        stacked ? "inline-flex flex-col leading-none" : "inline-flex items-baseline gap-2",
        className,
      )}
    >
      <span
        className={cn(
          "font-semibold tracking-tight",
          size === "sm" && "text-base",
          size === "md" && "text-lg",
          size === "lg" && "text-2xl",
          tone === "invert" ? "text-white" : "text-foreground",
        )}
      >
        CH360
      </span>
      <span
        className={cn(
          "font-medium uppercase",
          size === "sm" && "text-[0.6rem] tracking-[0.22em]",
          size === "md" && "text-[0.65rem] tracking-[0.24em]",
          size === "lg" && "text-xs tracking-[0.28em]",
          stacked && "mt-0.5",
          tone === "invert" ? "text-white/55" : "text-muted-foreground",
        )}
      >
        Creator Network
      </span>
    </span>
  );
}
