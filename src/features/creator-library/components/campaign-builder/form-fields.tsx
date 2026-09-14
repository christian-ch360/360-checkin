"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Raw-styled form primitives for the campaign builder — deliberately not the
 * shadcn Input/Textarea (those carry the app's theme-token colors, which
 * would look inconsistent against the Creator Library's fixed warm-ivory/
 * gold palette used everywhere else on this public surface).
 */

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="mb-1.5 block text-xs font-medium tracking-[0.08em] text-[#6B6B6B] uppercase">
      {children}
      {hint ? <span className="ml-1.5 normal-case text-[#B8935A]">({hint})</span> : null}
    </label>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-12 w-full rounded-xl border border-[#EAE1CB] bg-white px-3.5 py-2.5 text-sm text-[#161616] placeholder:text-[#6B6B6B]/60 transition-colors focus:border-[#D4AF6A] focus:outline-none",
        props.className,
      )}
    />
  );
}

export function TextAreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-none rounded-xl border border-[#EAE1CB] bg-white px-3.5 py-2.5 text-sm text-[#161616] placeholder:text-[#6B6B6B]/60 transition-colors focus:border-[#D4AF6A] focus:outline-none",
        props.className,
      )}
    />
  );
}

export function ToggleChip({
  label,
  active,
  onClick,
  emoji,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  emoji?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200",
        active
          ? "border-[#161616] bg-[#161616] text-white"
          : "border-[#E8D5A3] bg-white text-[#161616] hover:border-[#D4AF6A] hover:bg-[#F5F1E8]",
      )}
    >
      {emoji ? (
        <span aria-hidden className="text-[0.9em]">
          {emoji}
        </span>
      ) : null}
      {label}
    </button>
  );
}

export function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[#161616]">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-[#6B6B6B]">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
