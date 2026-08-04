"use client";

import { useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GripVertical, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  reorderSectionsAction,
  setSectionEnabledAction,
  addCustomSectionAction,
  removeCustomSectionAction,
} from "@/features/kiosk/services/kiosk-sections-actions";

type SectionRow = { key: string; sectionType: string; label: string | null; order: number; enabled: boolean };

const TYPE_LABEL: Record<string, string> = {
  HERO: "Hero Banner",
  WELCOME_MESSAGE: "Welcome Message",
  EVENT_BANNER: "Event Banner",
  ANNOUNCEMENTS: "Announcements",
  SPONSORS: "Sponsor Section",
  FEATURED_CREATOR: "Featured Creator",
  FEATURED_BRAND: "Featured Brand",
  HIGHLIGHTS: "Today's Highlights",
  QR_CHECKIN: "QR Check-In",
  REGISTER_NOW: "Register Now",
  CUSTOM: "Custom",
};

/** "Homepage Builder — Drag-and-drop ordering ... Enable or disable sections with a toggle."
 * Native HTML5 drag events, no added dependency — a handle-only drag target keeps text
 * selection and toggle clicks from accidentally starting a drag. */
export function KioskHomepageBuilderTab({ sections }: { sections: SectionRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(sections);
  const [isPending, startTransition] = useTransition();
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  function persistOrder(next: SectionRow[]) {
    setRows(next);
    startTransition(async () => {
      const result = await reorderSectionsAction(next.map((r) => r.key));
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  }

  function handleDrop(targetKey: string) {
    if (!dragKey || dragKey === targetKey) return;
    const from = rows.findIndex((r) => r.key === dragKey);
    const to = rows.findIndex((r) => r.key === targetKey);
    if (from === -1 || to === -1) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragKey(null);
    persistOrder(next);
  }

  function toggleEnabled(row: SectionRow) {
    setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, enabled: !r.enabled } : r)));
    startTransition(async () => {
      const result = await setSectionEnabledAction(row.key, !row.enabled);
      if (!result.success) {
        toast.error(result.error);
        setRows((prev) => prev.map((r) => (r.key === row.key ? { ...r, enabled: row.enabled } : r)));
        return;
      }
      router.refresh();
    });
  }

  function addSection() {
    const label = newLabel.trim();
    if (!label) return;
    startTransition(async () => {
      const result = await addCustomSectionAction(label);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNewLabel("");
      router.refresh();
    });
  }

  function removeSection(key: string) {
    startTransition(async () => {
      const result = await removeCustomSectionAction(key);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Drag sections to reorder the kiosk homepage. Toggle a section off to hide it without deleting its configuration.
      </p>

      <div className="space-y-2">
        {rows.map((row) => (
          <Card
            key={row.key}
            draggable
            onDragStart={() => setDragKey(row.key)}
            onDragOver={(e: DragEvent) => e.preventDefault()}
            onDrop={() => handleDrop(row.key)}
            className={`border shadow-sm transition-opacity ${dragKey === row.key ? "opacity-50" : ""}`}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <span className="cursor-grab text-muted-foreground active:cursor-grabbing">
                <GripVertical className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{row.label ?? TYPE_LABEL[row.sectionType]}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABEL[row.sectionType] ?? row.sectionType}</p>
              </div>
              <Switch checked={row.enabled} onCheckedChange={() => toggleEnabled(row)} disabled={isPending} />
              {row.sectionType === "CUSTOM" && (
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeSection(row.key)} disabled={isPending}>
                  <Trash2 className="size-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed shadow-none">
        <CardContent className="flex items-center gap-2 p-3">
          <Input
            placeholder="Custom section name"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSection()}
          />
          <Button size="sm" variant="outline" onClick={addSection} disabled={isPending || !newLabel.trim()}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add Section
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
