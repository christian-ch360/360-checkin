"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, MessageSquareWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { approveEvent, rejectEvent, requestEventChanges } from "@/features/events/services/event-actions";

/** Approve / Reject / Request Changes — the three admin decisions on a PENDING_APPROVAL proposal. */
export function EventReviewActions({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function handleApprove() {
    startTransition(async () => {
      const result = await approveEvent(eventId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Event approved and published");
      router.push("/admin/events");
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectEvent(eventId, reason);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Event declined");
      setRejectOpen(false);
      router.push("/admin/events");
      router.refresh();
    });
  }

  function handleRequestChanges() {
    startTransition(async () => {
      const result = await requestEventChanges(eventId, note);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Changes requested");
      setChangesOpen(false);
      router.push("/admin/events");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={isPending} onClick={handleApprove}>
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        Approve
      </Button>

      <Dialog open={changesOpen} onOpenChange={setChangesOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <MessageSquareWarning className="size-3.5" /> Request changes
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request changes</DialogTitle>
            <DialogDescription>The proposal returns to Draft and the host is notified.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What needs to change?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-24"
          />
          <DialogFooter>
            <Button disabled={isPending || note.trim().length < 3} onClick={handleRequestChanges}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="destructive">
            <X className="size-3.5" /> Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this proposal</DialogTitle>
            <DialogDescription>The host will be notified with your reason.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Why is this being declined?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-24"
          />
          <DialogFooter>
            <Button variant="destructive" disabled={isPending || reason.trim().length < 3} onClick={handleReject}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
