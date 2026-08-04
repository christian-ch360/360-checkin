import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { EmailStatus } from "@prisma/client";

const STATUS_STYLES: Record<EmailStatus, string> = {
  SENT: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  QUEUED: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  RETRYING: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  FAILED: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  // Not written by any code path yet — reserved for a future Resend webhook
  // handler (see EmailStatus's schema comment). Styled now so the history
  // table doesn't need another change when that handler ships.
  DELIVERED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  OPENED: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  CLICKED: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  BOUNCED: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
  COMPLAINED: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
};

export type EmailHistoryRow = {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: EmailStatus;
  attempts: number;
  error: string | null;
  createdAt: Date;
  member: { id: string; fullName: string } | null;
};

export function EmailHistoryTable({ logs }: { logs: EmailHistoryRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email history</CardTitle>
        <CardDescription>{logs.length} recent send{logs.length === 1 ? "" : "s"}</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No emails sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{log.member?.fullName ?? log.to}</div>
                      <div className="text-xs text-muted-foreground">{log.to}</div>
                    </TableCell>
                    <TableCell className="max-w-64 truncate text-sm">{log.subject}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{log.template}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[log.status]
                        )}
                        title={log.error ?? undefined}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {log.status}
                        {log.attempts > 1 && <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">×{log.attempts}</Badge>}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(log.createdAt, "MMM d, h:mm a")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
