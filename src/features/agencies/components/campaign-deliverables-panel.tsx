"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeliverableStatusBadge } from "@/features/agencies/components/crm-status-badge";
import { DeliverableReviewButtons } from "@/features/agencies/components/deliverable-review-buttons";
import { createDeliverable, submitDeliverable, deleteDeliverable } from "@/features/agencies/services/campaign-actions";
import type { CampaignDeliverable } from "@prisma/client";

type Creator = { id: string; fullName: string };

function SubmitDeliverableForm({ deliverableId }: { deliverableId: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Input placeholder="Link to your work" value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 text-xs" />
      <Button
        size="sm"
        disabled={!url.trim() || isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await submitDeliverable(deliverableId, url.trim());
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            setUrl("");
            router.refresh();
          })
        }
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Submit"}
      </Button>
    </div>
  );
}

function NewDeliverableDialog({ campaignId, creators }: { campaignId: string; creators: Creator[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedCreatorId, setAssignedCreatorId] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createDeliverable(campaignId, {
        title: title.trim(),
        dueDate: dueDate || undefined,
        assignedCreatorId: assignedCreatorId || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTitle("");
      setDueDate("");
      setAssignedCreatorId("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" /> Deliverable
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>New deliverable</DialogTitle>
          <DialogDescription>Add a deliverable and optionally assign it to a creator.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input placeholder="Instagram Reel" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Assign to</Label>
            <Select value={assignedCreatorId || undefined} onValueChange={setAssignedCreatorId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {creators.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!title.trim() || isPending} className="w-full">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Add deliverable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CampaignDeliverablesPanel({
  campaignId,
  deliverables,
  creators,
  actorId,
  canManage,
  canReview,
}: {
  campaignId: string;
  deliverables: CampaignDeliverable[];
  creators: Creator[];
  actorId: string;
  canManage: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        {canManage && <NewDeliverableDialog campaignId={campaignId} creators={creators} />}
      </div>

      {deliverables.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliverables yet.</p>
      ) : (
        <ul className="space-y-2">
          {deliverables.map((d) => (
            <li key={d.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{d.title}</p>
                  {d.dueDate && <p className="text-xs text-muted-foreground">Due {format(d.dueDate, "MMM d, yyyy")}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {d.status === "SUBMITTED" && canReview ? (
                    <DeliverableReviewButtons deliverableId={d.id} />
                  ) : (
                    <DeliverableStatusBadge status={d.status} />
                  )}
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm("Delete this deliverable?")) return;
                        startTransition(async () => {
                          const result = await deleteDeliverable(d.id);
                          if (!result.success) {
                            toast.error(result.error);
                            return;
                          }
                          router.refresh();
                        });
                      }}
                      disabled={isPending}
                      className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {d.assignedCreatorId === actorId && (d.status === "PENDING" || d.status === "REJECTED") && (
                <SubmitDeliverableForm deliverableId={d.id} />
              )}
              {d.submittedUrl && (
                <a href={d.submittedUrl} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline">
                  {d.submittedUrl}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
