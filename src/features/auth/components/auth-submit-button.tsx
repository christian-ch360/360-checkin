import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function AuthSubmitButton({
  isPending,
  children,
  variant = "dark",
}: {
  isPending: boolean;
  children: ReactNode;
  variant?: "dark" | "light";
}) {
  const light = variant === "light";
  return (
    <button
      type="submit"
      disabled={isPending}
      className={
        light
          ? "flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-[15px] font-semibold text-white outline-none transition-all duration-200 hover:bg-black/85 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-black/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          : "flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-white text-[15px] font-semibold text-black outline-none transition-all duration-200 hover:bg-white/90 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090b]"
      }
    >
      {isPending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
