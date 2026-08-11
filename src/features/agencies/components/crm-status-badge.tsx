import type { CampaignStatus, DeliverableStatus, ContractStatus, InvoiceStatus, TaskPriority } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";

const CAMPAIGN_STYLES: Record<CampaignStatus, string> = {
  DRAFT: statusToneClass.neutral,
  PENDING_APPROVAL: statusToneClass.warning,
  ACTIVE: statusToneClass.success,
  COMPLETED: statusToneClass.info,
  CANCELLED: statusToneClass.error,
};

const DELIVERABLE_STYLES: Record<DeliverableStatus, string> = {
  PENDING: statusToneClass.neutral,
  SUBMITTED: statusToneClass.warning,
  APPROVED: statusToneClass.success,
  REJECTED: statusToneClass.error,
};

const CONTRACT_STYLES: Record<ContractStatus, string> = {
  DRAFT: statusToneClass.neutral,
  SENT: statusToneClass.warning,
  SIGNED: statusToneClass.success,
  DECLINED: statusToneClass.error,
  EXPIRED: statusToneClass.error,
  CANCELLED: statusToneClass.neutral,
};

const INVOICE_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: statusToneClass.neutral,
  SENT: statusToneClass.warning,
  PAID: statusToneClass.success,
  OVERDUE: statusToneClass.error,
  CANCELLED: statusToneClass.neutral,
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  LOW: statusToneClass.neutral,
  MEDIUM: statusToneClass.info,
  HIGH: statusToneClass.warning,
  URGENT: statusToneClass.error,
};

function label(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return (
    <Badge variant="outline" className={cn(CAMPAIGN_STYLES[status])}>
      {label(status)}
    </Badge>
  );
}

export function DeliverableStatusBadge({ status }: { status: DeliverableStatus }) {
  return (
    <Badge variant="outline" className={cn(DELIVERABLE_STYLES[status])}>
      {label(status)}
    </Badge>
  );
}

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return (
    <Badge variant="outline" className={cn(CONTRACT_STYLES[status])}>
      {label(status)}
    </Badge>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={cn(INVOICE_STYLES[status])}>
      {label(status)}
    </Badge>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <Badge variant="outline" className={cn(PRIORITY_STYLES[priority])}>
      {label(priority)}
    </Badge>
  );
}
