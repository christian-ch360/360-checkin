"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Pin, Loader2, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createAnnouncementAction,
  updateAnnouncementAction,
  publishAnnouncementAction,
  archiveAnnouncementAction,
  setAnnouncementPinnedAction,
  deleteAnnouncementAction,
} from "@/features/kiosk/services/kiosk-announcements-actions";

type AnnouncementRow = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaLink: string | null;
  priority: number;
  isPinned: boolean;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
};

const emptyForm = { title: "", description: "", imageUrl: "", ctaLabel: "", ctaLink: "", priority: "0" };

export function KioskAnnouncementsTab({ announcements }: { announcements: AnnouncementRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(row: AnnouncementRow) {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description ?? "",
      imageUrl: row.imageUrl ?? "",
      ctaLabel: row.ctaLabel ?? "",
      ctaLink: row.ctaLink ?? "",
      priority: String(row.priority),
    });
    setDialogOpen(true);
  }

  function save() {
    if (!form.title.trim()) return;
    const input = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      ctaLabel: form.ctaLabel.trim() || null,
      ctaLink: form.ctaLink.trim() || null,
      priority: Number.parseInt(form.priority, 10) || 0,
    };
    startTransition(async () => {
      const result = editing ? await updateAnnouncementAction(editing.id, input) : await createAnnouncementAction(input);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Announcement updated." : "Announcement created.");
      setDialogOpen(false);
      router.refresh();
    });
  }

  function run(id: string, label: string, action: () => Promise<{ success: boolean; error?: string }>) {
    setActingOn(id);
    startTransition(async () => {
      const result = await action();
      setActingOn(null);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(label);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" /> New Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Create one to start rotating it on the kiosk homepage." />
      ) : (
        <div className="space-y-2">
          {announcements.map((row) => {
            const busy = isPending && actingOn === row.id;
            return (
              <Card key={row.id} className="border shadow-sm">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{row.title}</p>
                      <Badge variant="outline">{row.status}</Badge>
                      {row.isPinned && <Badge variant="secondary">Pinned</Badge>}
                    </div>
                    {row.description && <p className="truncate text-xs text-muted-foreground">{row.description}</p>}
                    {(row.startDate || row.endDate) && (
                      <p className="text-xs text-muted-foreground">
                        {row.startDate ? format(row.startDate, "MMM d, yyyy") : "Always"} –{" "}
                        {row.endDate ? format(row.endDate, "MMM d, yyyy") : "No end"}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={row.isPinned ? "default" : "outline"}
                      disabled={busy}
                      onClick={() => run(row.id, row.isPinned ? "Unpinned." : "Pinned.", () => setAnnouncementPinnedAction(row.id, !row.isPinned))}
                    >
                      <Pin className="size-3.5" /> {row.isPinned ? "Unpin" : "Pin"}
                    </Button>
                    {row.status !== "PUBLISHED" && (
                      <Button size="sm" disabled={busy} onClick={() => run(row.id, "Published.", () => publishAnnouncementAction(row.id))}>
                        Publish
                      </Button>
                    )}
                    {row.status !== "ARCHIVED" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => run(row.id, "Archived.", () => archiveAnnouncementAction(row.id))}>
                        Archive
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      disabled={busy}
                      onClick={() => run(row.id, "Deleted.", () => deleteAnnouncementAction(row.id))}
                    >
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Announcement" : "New Announcement"}</DialogTitle>
            <DialogDescription>Rotates on the kiosk homepage alongside other published announcements.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ann-title">Title</Label>
              <Input id="ann-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-description">Description</Label>
              <Textarea id="ann-description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-image">Image URL</Label>
              <Input id="ann-image" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ann-cta-label">CTA Label</Label>
                <Input id="ann-cta-label" value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ann-cta-link">CTA Link</Label>
                <Input id="ann-cta-link" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-priority">Priority (higher shows more often)</Label>
              <Input id="ann-priority" type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isPending || !form.title.trim()}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save as Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
