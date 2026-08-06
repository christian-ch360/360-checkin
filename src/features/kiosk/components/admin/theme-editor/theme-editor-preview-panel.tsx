import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KioskChrome } from "@/features/kiosk/components/kiosk-chrome";
import { KioskApp } from "@/features/kiosk/components/kiosk-app";
import { KioskPreviewProvider } from "@/features/kiosk/context/kiosk-preview-context";
import type { ResolvedKioskTheme } from "@/features/kiosk/services/kiosk-theme-resolution.service";
import { DEVICE_SIZES, DevicePreviewSwitcher } from "./device-preview-switcher";

export const THEME_PREVIEW_PANEL_ID = "theme-editor-preview-panel";

export function ThemeEditorPreviewPanel({
  previewTheme,
  device,
  onDeviceChange,
  previewAsLive,
  onPreviewAsLiveChange,
  wouldBeLive,
  kioskName,
  kioskLocation,
}: {
  previewTheme: ResolvedKioskTheme;
  device: keyof typeof DEVICE_SIZES;
  onDeviceChange: (device: keyof typeof DEVICE_SIZES) => void;
  previewAsLive: string;
  onPreviewAsLiveChange: (value: string) => void;
  wouldBeLive: boolean;
  /** Same values /kiosk/page.tsx reads server-side (KIOSK_NAME/KIOSK_LOCATION)
   * — passed down as plain props since that config module is server-only and
   * this panel renders inside a Client Component tree. */
  kioskName: string;
  kioskLocation: string | null;
}) {
  const simulatedNow = previewAsLive ? new Date(previewAsLive) : null;

  return (
    <div id={THEME_PREVIEW_PANEL_ID} className="xl:sticky xl:top-[calc(3.5rem+env(safe-area-inset-top)+3.5rem)] xl:self-start">
      <Card className="border shadow-sm">
        <CardHeader className="space-y-3">
          <CardTitle className="text-sm font-semibold">Preview Theme</CardTitle>
          <DevicePreviewSwitcher device={device} onChange={onDeviceChange} />
          <div className="space-y-1.5">
            <Label htmlFor="preview-as-live" className="text-xs">
              Preview as Live (simulate date &amp; time)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="preview-as-live"
                type="datetime-local"
                value={previewAsLive}
                onChange={(e) => onPreviewAsLiveChange(e.target.value)}
                className="text-xs"
              />
              <Badge variant="outline" className={wouldBeLive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "text-muted-foreground"}>
                {wouldBeLive ? "Would be Live" : "Not scheduled"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border" style={{ width: "100%" }}>
            {/* `contain: layout` gives KioskLayout's `fixed inset-0` a containing
                block scoped to this box instead of the real browser viewport —
                the only reason this frame exists at all is to size/scale the
                real production tree for side-by-side viewing; it contributes no
                visual styling of its own. */}
            <div
              className="relative mx-auto overflow-hidden transition-all"
              style={{ width: DEVICE_SIZES[device].width, height: DEVICE_SIZES[device].height, maxWidth: "100%", contain: "layout" }}
            >
              <KioskPreviewProvider simulatedNow={simulatedNow}>
                <KioskChrome>
                  <KioskApp kioskName={kioskName} kioskLocation={kioskLocation} location={null} theme={previewTheme} announcements={[]} featuredEvent={null} />
                </KioskChrome>
              </KioskPreviewProvider>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
