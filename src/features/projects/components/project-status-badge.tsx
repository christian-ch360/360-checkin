import type { ProjectStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<ProjectStatus, string> = {
  PLANNING: statusToneClass.neutral,
  ACTIVE: statusToneClass.success,
  ON_HOLD: statusToneClass.warning,
  COMPLETED: statusToneClass.info,
  CANCELLED: statusToneClass.error,
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn(STATUS_STYLES[status])}>
      {status.replace("_", " ").toLowerCase()}
    </Badge>
  );
}
