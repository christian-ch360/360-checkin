import { format } from "date-fns";
import type { Visitor } from "@prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<Visitor["status"], string> = {
  WAITING: statusToneClass.warning,
  APPROVED: statusToneClass.success,
  CHECKED_OUT: statusToneClass.neutral,
};

const STATUS_LABELS: Record<Visitor["status"], string> = {
  WAITING: "Waiting",
  APPROVED: "On-site",
  CHECKED_OUT: "Checked out",
};

export function RecentVisitorsTable({ visitors }: { visitors: Visitor[] }) {
  if (visitors.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No visitors yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Visitor</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Arrived</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visitors.map((v) => (
          <TableRow key={v.id}>
            <TableCell className="text-sm font-medium">
              {v.firstName} {v.lastName}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{v.company || "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{v.reasonForVisit}</TableCell>
            <TableCell className="text-sm">{format(v.arrivedAt, "MMM d, h:mm a")}</TableCell>
            <TableCell>
              <Badge variant="outline" className={STATUS_STYLES[v.status]}>
                {STATUS_LABELS[v.status]}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
