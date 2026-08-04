import type { ComponentProps } from "react";

export function AuthTextarea({
  label,
  id,
  className,
  variant = "dark",
  ...props
}: ComponentProps<"textarea"> & { label: string; variant?: "dark" | "light" }) {
  const light = variant === "light";
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={light ? "text-sm font-medium text-black/70" : "text-sm font-medium text-white/80"}>
        {label}
      </label>
      <textarea
        id={id}
        data-slot="textarea"
        rows={3}
        className={
          light
            ? `w-full resize-none rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-[15px] text-black placeholder:text-black/30 outline-none transition-colors focus:border-black/25 focus:bg-black/[0.04] ${className ?? ""}`
            : `w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-4 text-[15px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-white/25 focus:bg-white/[0.06] ${className ?? ""}`
        }
        {...props}
      />
    </div>
  );
}
