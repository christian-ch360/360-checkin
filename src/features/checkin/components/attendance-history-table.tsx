import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LiveDuration } from "@/features/checkin/components/live-duration";
import { formatDuration } from "@/lib/utils/format";
import { statusToneClass } from "@/lib/utils/status-colors";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AttendanceHistoryTable({
  checkIns,
}: {
  checkIns: {
    id: string;
    checkIn: Date;
    checkOut: Date | null;
    duration: number | null;
    status: "CHECKED_IN" | "CHECKED_OUT";
    member: { id: string; fullName: string; memberNumber: string; profilePhotoUrl: string | null };
  }[];
}) {
  if (checkIns.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No attendance history yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member ID</TableHead>
          <TableHead>Member</TableHead>
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
              <TableCell className="text-sm text-muted-foreground">{c.member.memberNumber}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="size-6">
                    {c.member.profilePhotoUrl && (
                      <AvatarImage src={c.member.profilePhotoUrl} alt={c.member.fullName} />
                    )}
                    <AvatarFallback className="text-[10px]">{initials(c.member.fullName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{c.member.fullName}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm tabular-nums">{format(c.checkIn, "h:mm a")}</TableCell>
              <TableCell className="text-sm tabular-nums">
                {c.checkOut ? format(c.checkOut, "h:mm a") : "—"}
              </TableCell>
              <TableCell className="text-right text-sm tabular-nums">
                {isOpen ? (
                  <LiveDuration since={c.checkIn} />
                ) : c.duration != null ? (
                  formatDuration(c.duration)
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                {isOpen ? (
                  <Badge variant="outline" className={cn(statusToneClass.success)}>
                    Checked In
                  </Badge>
                ) : (
                  <Badge variant="outline" className={cn(statusToneClass.neutral)}>
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
