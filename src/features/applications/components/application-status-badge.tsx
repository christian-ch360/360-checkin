import type { MembershipApplicationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<MembershipApplicationStatus, string> = {
  PENDING: statusToneClass.warning,
  APPROVED: statusToneClass.success,
  REJECTED: statusToneClass.error,
  // A resolution state, not a rejection — neutral, not error-toned.
  DUPLICATE: statusToneClass.neutral,
};

export function ApplicationStatusBadge({ status }: { status: MembershipApplicationStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_STYLES[status])}>
      {status.toLowerCase()}
    </Badge>
  );
}
