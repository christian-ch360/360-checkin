import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatCompactCurrency } from "@/lib/utils/format";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<string, string> = {
  PLANNING: statusToneClass.neutral,
  ACTIVE: statusToneClass.success,
  ON_HOLD: statusToneClass.warning,
  COMPLETED: statusToneClass.info,
  CANCELLED: statusToneClass.error,
};

export function MemberProjectsList({
  assignments,
}: {
  assignments: {
    id: string;
    role: string;
    commissionPct: string;
    contributionPct: string;
    hours: string;
    status: string;
    project: { id: string; name: string; status: string; gmv: string };
  }[];
}) {
  if (assignments.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Not assigned to any projects yet.</p>;
  }

  return (
    <div className="divide-y">
      {assignments.map((a) => (
        <Link
          key={a.id}
          href={`/projects/${a.project.id}`}
          className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/50 -mx-2 px-2 rounded-md"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{a.project.name}</p>
            <p className="text-xs text-muted-foreground">
              {a.role} · {a.commissionPct}% commission · {Number(a.hours).toFixed(1)}h logged
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-sm font-medium">{formatCompactCurrency(Number(a.project.gmv))}</span>
            <Badge variant="outline" className={STATUS_STYLES[a.project.status]}>
              {a.project.status.replace("_", " ").toLowerCase()}
            </Badge>
          </div>
        </Link>
      ))}
    </div>
  );
}
