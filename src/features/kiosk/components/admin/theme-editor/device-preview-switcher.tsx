import { Smartphone, Tablet, Monitor, MonitorSmartphone } from "lucide-react";

// Heights give the reused kiosk layout (which is built for a real, fixed
// viewport — see KioskLayout's `fixed inset-0`) something concrete to fill
// inside the preview frame; widths drive the responsive breakpoints exactly
// like resizing a real browser/device would.
export const DEVICE_SIZES: Record<string, { width: string; height: string; icon: typeof Monitor; label: string }> = {
  desktop: { width: "100%", height: "900px", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", height: "1024px", icon: Tablet, label: "Tablet" },
  kiosk: { width: "480px", height: "854px", icon: MonitorSmartphone, label: "Kiosk" },
  mobile: { width: "375px", height: "812px", icon: Smartphone, label: "Mobile" },
};

export function DevicePreviewSwitcher({
  device,
  onChange,
}: {
  device: keyof typeof DEVICE_SIZES;
  onChange: (device: keyof typeof DEVICE_SIZES) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(DEVICE_SIZES) as (keyof typeof DEVICE_SIZES)[]).map((key) => {
        const opt = DEVICE_SIZES[key];
        const Icon = opt.icon;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${device === key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Icon className="size-3.5" /> {opt.label}
          </button>
        );
      })}
    </div>
  );
}
