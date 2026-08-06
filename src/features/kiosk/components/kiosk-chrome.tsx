import type { ReactNode } from "react";
import { KioskBackground } from "@/features/kiosk/components/kiosk-background";
import { SafeAreaView } from "@/components/layout/safe-area-view";

/**
 * The kiosk's full-bleed shell — light-mode token scope, ambient background,
 * safe-area padding. Extracted out of app/kiosk/layout.tsx (which stays a
 * thin wrapper carrying the route's metadata/viewport exports — those can't
 * coexist with this component being reused from a Client Component) so both
 * the real /kiosk route and the admin Theme Editor's live preview render
 * this exact chrome instead of the preview reimplementing its own.
 */
export function KioskChrome({ children }: { children: ReactNode }) {
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
