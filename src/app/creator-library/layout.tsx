import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Caveat } from "next/font/google";

// Lives at the top level, outside the (dashboard) route group — the same way
// /kiosk does — so it renders none of the Sidebar/Topbar/BottomNav chrome and
// never calls getCurrentMember(). Its own shared-password gate runs in
// middleware.ts (guardCreatorLibrary) before this tree is reached.

// Handwriting accent used only for the hero's "Creators Build What's Next"
// editorial mark. Scoped to this layout so it never touches the rest of the app.
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-script" });

export const metadata: Metadata = {
  title: {
    default: "CreatorHub360 Creator Network",
    template: "%s · CreatorHub360 Creator Network",
  },
  description: "Discover the creators behind the network.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Fixed warm-ivory/charcoal/gold editorial palette — deliberately independent
// of the app's light/dark theme (same rationale as /login and /kiosk), so
// the public Creator Network always reads as a bright luxury directory
// regardless of the visitor's system theme.
export default function CreatorLibraryLayout({ children }: { children: ReactNode }) {
  return <div className={`${caveat.variable} min-h-svh bg-[#FAF9F6] text-[#161616]`}>{children}</div>;
}
