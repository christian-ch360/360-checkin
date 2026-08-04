import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ScrollText } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  "legal.document.draft_created": "Created draft",
  "legal.document.draft_updated": "Edited draft",
  "legal.document.draft_deleted": "Deleted draft",
  "legal.document.published": "Published version",
  "legal.document.acceptance_report_downloaded": "Downloaded acceptance report",
  "legal.member.forced_reaccept": "Forced re-acceptance",
};

type LegalAuditLog = {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: string;
  actorName: string;
  affectedMemberName: string | null;
  after: unknown;
  before: unknown;
};

function documentLabel(log: LegalAuditLog): string {
  const payload = (log.after ?? log.before) as { documentType?: string; version?: string } | null;
  if (log.entityType !== "legal_document_version" || !payload?.documentType) return "—";
  return `${payload.documentType}${payload.version ? ` v${payload.version}` : ""}`;
}

export function LegalAuditLogTable({ logs }: { logs: LegalAuditLog[] }) {
  if (logs.length === 0) {
    return <EmptyState icon={ScrollText} title="No legal activity yet" description="Publishes, edits, and re-acceptances will appear here." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Admin</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Affected Document</TableHead>
            <TableHead>Affected Member</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-sm text-muted-foreground">{format(log.createdAt, "MMM d, yyyy h:mm a")}</TableCell>
              <TableCell className="text-sm font-medium">{log.actorName}</TableCell>
              <TableCell className="text-sm">{ACTION_LABELS[log.action] ?? log.action}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{documentLabel(log)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{log.affectedMemberName ?? "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
