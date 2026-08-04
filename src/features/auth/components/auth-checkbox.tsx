import type { ComponentProps, ReactNode } from "react";
import { Check } from "lucide-react";

export function AuthCheckbox({
  label,
  id,
  className,
  variant = "dark",
  ...props
}: ComponentProps<"input"> & { label: ReactNode; variant?: "dark" | "light" }) {
  const light = variant === "light";
  return (
    <label htmlFor={id} className={`flex select-none items-center gap-2.5 text-sm ${light ? "text-black/60" : "text-white/60"}`}>
      <span className="relative flex size-4 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          className={
            light
              ? `peer size-4 shrink-0 appearance-none rounded-[5px] border border-black/20 bg-black/[0.02] outline-none transition-colors checked:border-black checked:bg-black focus-visible:ring-2 focus-visible:ring-black/20 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${className ?? ""}`
              : `peer size-4 shrink-0 appearance-none rounded-[5px] border border-white/20 bg-white/[0.03] outline-none transition-colors checked:border-white/70 checked:bg-white focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b] ${className ?? ""}`
          }
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className={`pointer-events-none absolute inset-0 m-auto size-3 scale-0 transition-transform peer-checked:scale-100 ${light ? "text-white" : "text-black"}`}
        />
      </span>
      {label}
    </label>
  );
}
