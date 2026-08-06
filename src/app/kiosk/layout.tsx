import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { KioskChrome } from "@/features/kiosk/components/kiosk-chrome";

// Deliberately does NOT call getCurrentMember()/redirect — this route tree
// must stay public (see middleware.ts PUBLIC_PATHS). It also renders none of
// the (dashboard) layout's Sidebar/Topbar/BottomNav/CommandPalette simply by
// living outside that route group.
export const metadata: Metadata = {
  title: "CreatorHub360 Kiosk",
  manifest: "/kiosk.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CH360 Kiosk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function KioskLayout({ children }: { children: ReactNode }) {
  return <KioskChrome>{children}</KioskChrome>;
}
