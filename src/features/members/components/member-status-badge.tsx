import type { MemberStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<MemberStatus, string> = {
  ACTIVE: statusToneClass.success,
  INACTIVE: statusToneClass.neutral,
  SUSPENDED: statusToneClass.error,
  PENDING: statusToneClass.warning,
  REJECTED: statusToneClass.error,
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
