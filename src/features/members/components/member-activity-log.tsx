import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type MemberAuditLogEntry = {
  id: string;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
  actorName: string;
};

function roleValue(json: unknown): string | null {
  if (json && typeof json === "object" && "systemRole" in json) {
    const value = (json as { systemRole?: unknown }).systemRole;
    return typeof value === "string" ? value.replaceAll("_", " ") : null;
  }
  return null;
}

function describe(entry: MemberAuditLogEntry): string {
  if (entry.action === "member.role_changed") {
    const before = roleValue(entry.before);
    const after = roleValue(entry.after);
    if (before && after) return `${before} → ${after}`;
  }
  return entry.action;
}

export function MemberActivityLog({ entries }: { entries: MemberAuditLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Actor</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="text-sm font-medium">{entry.actorName}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{describe(entry)}</TableCell>
            <TableCell className="text-sm">{format(entry.createdAt, "MMM d, yyyy h:mm a")}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
