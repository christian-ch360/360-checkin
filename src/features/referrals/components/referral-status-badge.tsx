import type { ReferralStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<ReferralStatus, string> = {
  PENDING: statusToneClass.warning,
  ACTIVE: statusToneClass.success,
  REJECTED: statusToneClass.error,
  TRANSFERRED: statusToneClass.neutral,
};

export function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
