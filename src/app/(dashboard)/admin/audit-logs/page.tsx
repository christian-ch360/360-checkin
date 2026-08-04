import { redirect } from "next/navigation";
import { format } from "date-fns";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { listAuditLogs } from "@/features/admin/services/audit-log.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }

  const logs = await listAuditLogs(actor.organizationId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Audit logs</h1>
        <p className="text-sm text-muted-foreground">Every recorded administrative action in your organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>{logs.length} entr{logs.length === 1 ? "y" : "ies"}</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No audit log entries yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm font-medium">{log.actorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.action}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.entityType}</TableCell>
                    <TableCell className="text-sm">{format(log.createdAt, "MMM d, yyyy h:mm a")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
