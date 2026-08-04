import type { EmailStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<EmailStatus, string> = {
  SENT: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DELIVERED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  QUEUED: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  RETRYING: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  FAILED: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  BOUNCED: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  COMPLAINED: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  OPENED: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  CLICKED: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

// "Processing" reads better than the enum's own RETRYING for admins scanning
// the table — SENT/DELIVERED both display as "Delivered" since Resend's
// synchronous API only confirms hand-off, the best signal available until a
// future webhook sets DELIVERED for real.
const STATUS_LABELS: Record<EmailStatus, string> = {
  SENT: "Delivered",
  DELIVERED: "Delivered",
  QUEUED: "Queued",
  RETRYING: "Processing",
  FAILED: "Failed",
  BOUNCED: "Bounced",
  COMPLAINED: "Complained",
  OPENED: "Opened",
  CLICKED: "Clicked",
};

export function EmailStatusBadge({ status, className }: { status: EmailStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}
