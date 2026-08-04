import type { ComponentType } from "react";
import type { OAuthProvider } from "@/features/auth/services/actions";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    // fill-current, not a hardcoded color — the parent button controls
    // color via its own text-* class, so this renders correctly whether the
    // button is a dark pill (white apple) or a light one (black apple).
    <svg viewBox="0 0 24 24" className={`${className ?? ""} fill-current`} aria-hidden>
      <path d="M16.36 1c.13 1.06-.29 2.1-.94 2.86-.67.78-1.76 1.38-2.82 1.3-.15-1.03.34-2.1 1-2.83.72-.8 1.94-1.4 2.76-1.33ZM19.6 17.24c-.35.81-.77 1.56-1.26 2.26-.68.97-1.24 1.64-1.68 2.02-.68.63-1.41.96-2.19.98-.56.01-1.24-.16-2.02-.5-.79-.34-1.51-.5-2.18-.5-.7 0-1.44.16-2.24.5-.8.34-1.44.52-1.94.53-.75.03-1.5-.31-2.24-1.02-.47-.42-1.06-1.13-1.77-2.13C1.29 17.9.6 16.16.6 14.7c0-1.68.36-3.12 1.09-4.32a5.03 5.03 0 0 1 1.82-1.87 4.9 4.9 0 0 1 2.46-.71c.6 0 1.4.19 2.4.55.99.36 1.63.55 1.92.55.21 0 .93-.21 2.14-.62 1.15-.39 2.12-.55 2.92-.48 2.16.17 3.78 1.03 4.86 2.58a4.61 4.61 0 0 0-2.44 4.18c.02 1.65.62 3.02 1.83 4.11.55.5 1.15.88 1.82 1.15-.15.42-.31.83-.5 1.22Z" />
    </svg>
  );
}

export type OAuthProviderConfig = {
  provider: OAuthProvider;
  label: string;
  Icon: ComponentType<{ className?: string }>;
};

// The single place to add a new Supabase-supported OAuth provider — one new
// entry here, plus one new value in the OAuthProvider union in
// services/actions.ts, is the entire change. oauth-buttons.tsx just maps
// over this array, no per-provider JSX to hand-write.
export const OAUTH_PROVIDERS: OAuthProviderConfig[] = [
  { provider: "google", label: "Google", Icon: GoogleIcon },
  { provider: "apple", label: "Apple", Icon: AppleIcon },
];
