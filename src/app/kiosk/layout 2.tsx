import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { KioskBackground } from "@/features/kiosk/components/kiosk-background";
import { SafeAreaView } from "@/components/layout/safe-area-view";

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
  return (
    <div className="kiosk-light fixed inset-0 overflow-hidden overscroll-none bg-white text-black">
      <KioskBackground />
      {/* Background bleeds full-screen; only this content column reserves
          the notch/Dynamic Island/status bar/home indicator insets. */}
      <SafeAreaView as="div" className="h-full">
        {children}
      </SafeAreaView>
    </div>
  );
}
