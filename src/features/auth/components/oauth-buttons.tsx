"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { signInWithOAuthProvider } from "@/features/auth/services/actions";
import { OAUTH_PROVIDERS } from "@/features/auth/config/oauth-providers";

function OAuthSubmitButton({
  label,
  Icon,
  variant,
}: {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  variant: "dark" | "light";
}) {
  const { pending } = useFormStatus();
  const light = variant === "light";
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        light
          ? "flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          : "flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Icon className="size-[18px]" />}
      {label}
    </button>
  );
}

export function OAuthButtons({ redirectTo, variant = "dark" }: { redirectTo?: string; variant?: "dark" | "light" }) {
  const light = variant === "light";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={light ? "h-px flex-1 bg-black/10" : "h-px flex-1 bg-white/10"} />
        <span className={light ? "text-xs text-black/40" : "text-xs text-white/40"}>or continue with</span>
        <div className={light ? "h-px flex-1 bg-black/10" : "h-px flex-1 bg-white/10"} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {OAUTH_PROVIDERS.map(({ provider, label, Icon }) => (
          <form key={provider} action={signInWithOAuthProvider.bind(null, provider, redirectTo)}>
            <OAuthSubmitButton label={label} Icon={Icon} variant={variant} />
          </form>
        ))}
      </div>
    </div>
  );
}
