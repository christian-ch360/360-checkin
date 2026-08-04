"use client";

import { useId, useState, type ComponentProps } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

export function AuthPasswordInput({
  label,
  id,
  className,
  variant = "dark",
  ...props
}: ComponentProps<"input"> & { label: string; variant?: "dark" | "light" }) {
  const [visible, setVisible] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const light = variant === "light";

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className={light ? "text-sm font-medium text-black/70" : "text-sm font-medium text-white/80"}>
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
          <Lock className="size-[18px]" />
        </span>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          data-slot="input"
          className={`h-full w-full min-w-0 flex-1 bg-transparent pr-2 text-[15px] outline-none ${light ? "text-black placeholder:text-black/30" : "text-white placeholder:text-white/30"} ${className ?? ""}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className={
            light
              ? "flex w-12 shrink-0 items-center justify-center text-black/40 outline-none transition-colors hover:text-black/70 focus-visible:text-black/70"
              : "flex w-12 shrink-0 items-center justify-center text-white/40 outline-none transition-colors hover:text-white/70 focus-visible:text-white/70"
          }
        >
          {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
        </button>
      </div>
    </div>
  );
}
