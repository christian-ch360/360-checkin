"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Check, X, UserPlus2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  approveAgencyAccessRequestAction,
  rejectAgencyAccessRequestAction,
} from "@/features/agencies/services/agency-actions";
import type { PendingAccessRequest } from "@/features/agencies/services/agency-access.service";

const ROLE_LABELS: Record<string, string> = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" };

/** "Existing Agency Admin(s) receive a notification ... Approve or Reject." One row per person
 * asking to join this agency's team instead of registering a duplicate agency record. */
export function PendingAccessRequestsCard({ requests }: { requests: PendingAccessRequest[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingAccessRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  function handleApprove(request: PendingAccessRequest) {
    setActingOn(request.requestId);
    startTransition(async () => {
      const result = await approveAgencyAccessRequestAction(request.requestId);
      setActingOn(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${request.fullName} joined your team.`);
      router.refresh();
    });
  }

  function handleReject() {
    if (!rejecting) return;
    const target = rejecting;
    setActingOn(target.requestId);
    startTransition(async () => {
      const result = await rejectAgencyAccessRequestAction(target.requestId, rejectNote);
      setActingOn(null);
      setRejecting(null);
      setRejectNote("");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Request from ${target.fullName} declined.`);
      router.refresh();
    });
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2">
          <UserPlus2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Pending Access Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <EmptyState
              icon={UserPlus2}
              title="No pending access requests"
              description="If someone tries to register an agency that already exists, they can request to join your team here instead."
            />
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.requestId}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{request.fullName}</span>
                      <Badge variant="outline" className="text-xs">
                        Requested: {ROLE_LABELS[request.role] ?? request.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {request.email} · Requested {format(request.requestedAt, "MMM d, yyyy")}
                    </p>
                    {request.requestNote && (
                      <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">
                        &ldquo;{request.requestNote}&rdquo;
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending && actingOn === request.requestId}
                      onClick={() => setRejecting(request)}
                    >
                      <X className="size-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={isPending && actingOn === request.requestId}
                      onClick={() => handleApprove(request)}
                    >
                      {isPending && actingOn === request.requestId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {rejecting?.fullName}&apos;s access request?</AlertDialogTitle>
            <AlertDialogDescription>No access will be granted. They&apos;ll be notified.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional note (not shown to the requester)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
          />
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Reject request
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
