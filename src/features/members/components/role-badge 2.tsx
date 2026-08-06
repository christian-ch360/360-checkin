import type { SystemRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import { SYSTEM_ROLE_LABELS } from "@/lib/permissions/member-rules";

const ROLE_STYLES: Partial<Record<SystemRole, string>> = {
  MEMBER: statusToneClass.neutral,
  ADMIN: statusToneClass.warning,
  SUPER_ADMIN: statusToneClass.community,
};

export function RoleBadge({ role }: { role: SystemRole }) {
  return (
    <Badge variant="outline" className={cn(ROLE_STYLES[role] ?? statusToneClass.neutral)}>
      {SYSTEM_ROLE_LABELS[role]}
    </Badge>
  );
}
