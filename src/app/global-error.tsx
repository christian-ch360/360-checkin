"use client";

import { useEffect } from "react";

/**
 * Catches errors thrown by the root layout itself — the one case
 * src/app/error.tsx can't cover, since that boundary lives inside the root
 * layout and never fires if the layout is what crashed. This file replaces
 * the entire document (its own <html>/<body>), so it deliberately doesn't
 * import globals.css or any shared component — nothing here can assume the
 * app's normal stylesheet loaded. Everything is inline so the branded
 * maintenance page renders correctly even in this worst-case scenario.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#08090b", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <style>{`
          @keyframes maintenance-bounce {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div
          style={{
            minHeight: "100svh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "radial-gradient(45vw 45vw at 10% -10%, rgba(99,102,241,0.12), transparent), radial-gradient(40vw 40vw at 90% 110%, rgba(56,189,248,0.10), transparent), #08090b",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              borderRadius: 24,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              padding: 40,
              textAlign: "center",
              boxShadow: "0 24px 70px -24px rgba(0,0,0,0.7)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 20,
                  letterSpacing: "-0.02em",
                }}
              >
                CH
              </div>
            </div>

            <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 24 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.5)",
                    animation: "maintenance-bounce 1.4s ease-in-out infinite",
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>

            <h1 style={{ marginTop: 24, fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff" }}>
              We&apos;ll Be Back Shortly
            </h1>
            <p style={{ marginTop: 12, fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
              CreatorHub360 is currently undergoing maintenance or experiencing a temporary issue. Please check back
              in a few minutes.
            </p>

            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  height: 48,
                  borderRadius: 12,
                  background: "#fff",
                  color: "#000",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Refresh
              </button>
              {/* A plain anchor (not next/link) is intentional — the root
                  layout itself crashed, so a full page reload is the safe
                  bet rather than assuming client-side routing still works. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 15,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
