import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LiveDuration } from "@/features/checkin/components/live-duration";
import { formatDuration } from "@/lib/utils/format";

export function MemberAttendanceTable({
  checkIns,
}: {
  checkIns: {
    id: string;
    checkIn: Date;
    checkOut: Date | null;
    duration: number | null;
    status: "CHECKED_IN" | "CHECKED_OUT";
  }[];
}) {
  if (checkIns.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No check-ins recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Check In</TableHead>
          <TableHead>Check Out</TableHead>
          <TableHead className="text-right">Duration</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {checkIns.map((c) => {
          const isOpen = c.status === "CHECKED_IN";
          return (
            <TableRow key={c.id}>
              <TableCell className="text-sm">{format(c.checkIn, "MMM d, yyyy")}</TableCell>
              <TableCell className="text-sm tabular-nums">{format(c.checkIn, "h:mm a")}</TableCell>
              <TableCell className="text-sm tabular-nums">{c.checkOut ? format(c.checkOut, "h:mm a") : "—"}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {isOpen ? <LiveDuration since={c.checkIn} /> : c.duration != null ? formatDuration(c.duration) : "—"}
              </TableCell>
              <TableCell>
                {isOpen ? (
                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    🟢 Checked In
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Checked Out
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
