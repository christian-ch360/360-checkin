"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, RotateCw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmailStatusBadge } from "@/features/communications/components/email-status-badge";
import { fetchEmailLogDetail, retryEmailLogAction } from "@/features/communications/services/email-logs.actions";
import { EMAIL_CATEGORY_LABELS } from "@/features/communications/config/template-catalog";

type EmailLogDetail = Awaited<ReturnType<typeof fetchEmailLogDetail>>;

const RETRYABLE = new Set(["FAILED", "BOUNCED", "COMPLAINED"]);

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm">{value}</p>
    </div>
  );
}

function timelineFor(log: NonNullable<EmailLogDetail>) {
  const events: { label: string; timestamp: Date | null }[] = [
    { label: "Queued", timestamp: log.createdAt },
    { label: log.status === "FAILED" ? "Send attempted" : "Sent to Resend", timestamp: log.updatedAt },
    { label: "Delivered", timestamp: log.deliveredAt },
    { label: "Opened", timestamp: log.openedAt },
    { label: "Clicked", timestamp: log.clickedAt },
    { label: "Bounced", timestamp: log.bouncedAt },
    { label: "Failed", timestamp: log.failedAt },
  ];
  if (log.attempts > 1) events.push({ label: `Retry attempt (×${log.attempts})`, timestamp: log.updatedAt });
  return events.filter((e) => e.timestamp);
}

export function EmailDetailDrawer({
  logId,
  open,
  onOpenChange,
  canManage,
  onRetried,
}: {
  logId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onRetried?: () => void;
}) {
  const [log, setLog] = useState<EmailLogDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmingRetry, setConfirmingRetry] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !logId) {
      setLog(null);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetchEmailLogDetail(logId)
      .then(setLog)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load email."))
      .finally(() => setLoading(false));
  }, [logId, open]);

  function handleRetry() {
    if (!logId) return;
    startTransition(async () => {
      const result = await retryEmailLogAction(logId);
      setConfirmingRetry(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Email retried successfully");
      fetchEmailLogDetail(logId).then(setLog).catch(() => {});
      onRetried?.();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Email details</SheetTitle>
          <SheetDescription className="sr-only">Full details and preview for this sent email.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}

          {log && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{log.subject}</p>
                  <p className="truncate text-xs text-muted-foreground">{log.to}</p>
                </div>
                <EmailStatusBadge status={log.status} />
              </div>

              <section className="grid grid-cols-2 gap-3">
                <Field label="From" value={log.from ?? "—"} />
                <Field label="To" value={log.to} />
                <Field label="Template" value={log.template.replace(/_/g, " ")} />
                <Field label="Category" value={EMAIL_CATEGORY_LABELS[log.category]} />
                <Field label="Created" value={format(log.createdAt, "MMM d, yyyy 'at' h:mm a")} />
                <Field label="Sent" value={log.status !== "QUEUED" ? format(log.updatedAt, "MMM d, yyyy 'at' h:mm a") : "—"} />
                <Field label="Delivered" value={log.deliveredAt ? format(log.deliveredAt, "MMM d, yyyy 'at' h:mm a") : "—"} />
                <Field label="Opened" value={log.openedAt ? format(log.openedAt, "MMM d, yyyy 'at' h:mm a") : "—"} />
                <Field label="Clicked" value={log.clickedAt ? format(log.clickedAt, "MMM d, yyyy 'at' h:mm a") : "—"} />
                <Field label="Provider" value={log.provider} />
                <Field label="Resend Email ID" value={log.providerId ?? "—"} />
                <Field label="Retry Count" value={log.attempts} />
                {log.error && <Field label="Error Message" value={<span className="text-destructive">{log.error}</span>} />}
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Activity Timeline</h3>
                <ol className="space-y-2.5">
                  {timelineFor(log).map((event, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="flex-1">{event.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {event.timestamp ? format(event.timestamp, "MMM d, h:mm a") : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email Preview</h3>
                {log.html ? (
                  <Tabs defaultValue="desktop">
                    <TabsList>
                      <TabsTrigger value="desktop">Desktop</TabsTrigger>
                      <TabsTrigger value="mobile">Mobile</TabsTrigger>
                      <TabsTrigger value="raw">Raw HTML</TabsTrigger>
                      <TabsTrigger value="text">Plain Text</TabsTrigger>
                    </TabsList>
                    <TabsContent value="desktop" className="mt-3">
                      <iframe
                        srcDoc={log.html}
                        title="Desktop preview"
                        sandbox=""
                        className="h-[520px] w-full rounded-lg border bg-white"
                      />
                    </TabsContent>
                    <TabsContent value="mobile" className="mt-3 flex justify-center">
                      <iframe
                        srcDoc={log.html}
                        title="Mobile preview"
                        sandbox=""
                        className="h-[520px] w-[375px] rounded-lg border bg-white"
                      />
                    </TabsContent>
                    <TabsContent value="raw" className="mt-3">
                      <pre className="max-h-[520px] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                        {log.html}
                      </pre>
                    </TabsContent>
                    <TabsContent value="text" className="mt-3">
                      <pre className="max-h-[520px] overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                        {log.text}
                      </pre>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <p className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                    Original content isn&apos;t available for this email — it was sent before Email Center began storing
                    rendered content.
                  </p>
                )}
              </section>

              {canManage && RETRYABLE.has(log.status) && (
                <>
                  <Separator />
                  <Button className="w-full" variant="outline" onClick={() => setConfirmingRetry(true)}>
                    <RotateCw className="size-4" />
                    Retry Email
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={confirmingRetry} onOpenChange={setConfirmingRetry}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry this email?</AlertDialogTitle>
            <AlertDialogDescription>
              This resends the exact email content that was originally rendered, using the existing email service.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetry} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Retry Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
