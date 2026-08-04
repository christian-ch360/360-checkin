import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function SpaceSessionHistoryTable({
  sessions,
}: {
  sessions: {
    id: string;
    startedAt: Date;
    finishedAt: Date | null;
    durationMin: number | null;
    member: { fullName: string };
    project: { name: string } | null;
    brand: { name: string } | null;
    company: { name: string } | null;
  }[];
}) {
  if (sessions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No sessions logged yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Finished</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((s) => (
          <TableRow key={s.id}>
            <TableCell className="text-sm font-medium">{s.member.fullName}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{s.project?.name ?? "—"}</TableCell>
            <TableCell className="text-sm">{format(s.startedAt, "MMM d, h:mm a")}</TableCell>
            <TableCell className="text-sm">{s.finishedAt ? format(s.finishedAt, "h:mm a") : "—"}</TableCell>
            <TableCell className="text-right text-sm">
              {s.durationMin ? `${s.durationMin} min` : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
