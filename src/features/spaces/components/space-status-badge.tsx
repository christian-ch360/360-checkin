import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import type { SpaceStatus } from "@/features/spaces/services/spaces.service";

const STATUS_STYLES: Record<SpaceStatus, string> = {
  AVAILABLE: statusToneClass.success,
  OCCUPIED: statusToneClass.error,
  RESERVED: statusToneClass.info,
};

const STATUS_LABELS: Record<SpaceStatus, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
};

export function SpaceStatusBadge({ status, className }: { status: SpaceStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm",
        STATUS_STYLES[status],
        className
      )}
    >
      <span className="size-2 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}
