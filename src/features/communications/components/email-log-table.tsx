"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Eye, RotateCw, Trash2, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { EmptyState } from "@/components/shared/empty-state";
import { Mail } from "lucide-react";
import { EmailStatusBadge } from "@/features/communications/components/email-status-badge";
import { EmailDetailDrawer } from "@/features/communications/components/email-detail-drawer";
import { retryEmailLogAction, deleteEmailLogAction } from "@/features/communications/services/email-logs.actions";
import { EMAIL_CATEGORY_LABELS } from "@/features/communications/config/template-catalog";
import type { EmailLogListItem } from "@/features/communications/services/email-logs.service";

const RETRYABLE = new Set(["FAILED", "BOUNCED", "COMPLAINED"]);

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function EmailLogTable({ items, canManage }: { items: EmailLogListItem[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retryId, setRetryId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function handleRetry() {
    if (!retryId) return;
    startTransition(async () => {
      const result = await retryEmailLogAction(retryId);
      setRetryId(null);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Email retried successfully");
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleteId) return;
    startTransition(async () => {
      const result = await deleteEmailLogAction(deleteId);
      setDeleteId(null);
      if (!result.success) {
        toast.error(result.error);
      } else {
        toast.success("Email log deleted");
      }
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <EmptyState icon={Mail} title="No emails found" description="Try adjusting your filters or search." />;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Sent By</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((log) => {
              const name = log.recipientName ?? log.member?.fullName ?? null;
              const canRetry = canManage && RETRYABLE.has(log.status);
              return (
                <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelectedId(log.id)}>
                  <TableCell>
                    <EmailStatusBadge status={log.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-[10px]">{initials(name ?? log.to)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{name ?? "—"}</p>
                        <p className="truncate text-xs text-muted-foreground">{log.to}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-sm">{log.subject}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.template.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{EMAIL_CATEGORY_LABELS[log.category]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.sentBy?.fullName ?? "System"}</TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{format(log.createdAt, "MMM d, yyyy 'at' h:mm a")}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => setSelectedId(log.id)}>
                        <Eye className="size-3.5" />
                        <span className="sr-only">View</span>
                      </Button>
                      {canManage &&
                        (canRetry ? (
                          <Button variant="ghost" size="icon-sm" onClick={() => setRetryId(log.id)}>
                            <RotateCw className="size-3.5" />
                            <span className="sr-only">Retry</span>
                          </Button>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button variant="ghost" size="icon-sm" disabled>
                                  <RotateCw className="size-3.5" />
                                  <span className="sr-only">Retry</span>
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {log.status === "FAILED" || log.status === "BOUNCED" || log.status === "COMPLAINED"
                                ? "Original content unavailable for legacy emails"
                                : "Only failed emails can be retried"}
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      {canManage && (
                        <Button variant="ghost" size="icon-sm" onClick={() => setDeleteId(log.id)}>
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EmailDetailDrawer
        logId={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => !open && setSelectedId(null)}
        canManage={canManage}
        onRetried={() => router.refresh()}
      />

      <AlertDialog open={retryId !== null} onOpenChange={(open) => !open && setRetryId(null)}>
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

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this email log?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the log entry. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
