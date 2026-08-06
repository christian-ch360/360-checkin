import type { ComponentProps, ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function AuthSelect({
  label,
  id,
  icon,
  className,
  children,
  variant = "dark",
  error,
  ...props
}: ComponentProps<"select"> & { label: string; icon: ReactNode; variant?: "dark" | "light"; error?: string }) {
  const light = variant === "light";
  return (
    <div className="space-y-2">
      <label htmlFor={id} className={light ? "text-sm font-medium text-black/70" : "text-sm font-medium text-white/80"}>
        {label}
      </label>
      <div
        className={
          light
            ? "group relative flex h-14 items-center rounded-2xl border border-black/10 bg-black/[0.02] transition-colors focus-within:border-black/25 focus-within:bg-black/[0.04] has-[[aria-invalid=true]]:border-destructive/50 has-[[aria-invalid=true]]:bg-destructive/[0.04]"
            : "group relative flex h-14 items-center rounded-xl border border-white/10 bg-white/[0.03] transition-colors focus-within:border-white/25 focus-within:bg-white/[0.06] has-[[aria-invalid=true]]:border-destructive/50 has-[[aria-invalid=true]]:bg-destructive/[0.06]"
        }
      >
        <span
          className={
            light
              ? "pointer-events-none flex w-12 shrink-0 items-center justify-center text-black/40 group-focus-within:text-black/70"
              : "pointer-events-none flex w-12 shrink-0 items-center justify-center text-white/40 group-focus-within:text-white/70"
          }
        >
          {icon}
        </span>
        <select
          id={id}
          data-slot="select"
          aria-invalid={error ? true : undefined}
          className={`h-full w-full min-w-0 flex-1 appearance-none bg-transparent pr-2 text-[15px] outline-none ${light ? "text-black" : "text-white"} ${className ?? ""}`}
          {...props}
        >
          {children}
        </select>
        <span
          className={
            light
              ? "pointer-events-none flex w-10 shrink-0 items-center justify-center text-black/40"
              : "pointer-events-none flex w-10 shrink-0 items-center justify-center text-white/40"
          }
        >
          <ChevronDown className="size-4" />
        </span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
