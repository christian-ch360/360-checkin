import { format } from "date-fns";
import { FileText, StickyNote, CheckCircle2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ApplicationHistoryEntry = {
  id: string;
  action: string;
  createdAt: string;
  actorName: string;
};

const ACTION_META: Record<string, { label: string; icon: LucideIcon }> = {
  "application.submitted": { label: "Application Submitted", icon: FileText },
  "application.notes_updated": { label: "Notes Updated", icon: StickyNote },
  "application.approved": { label: "Approved", icon: CheckCircle2 },
  "application.rejected": { label: "Rejected", icon: XCircle },
};

export function ApplicationHistory({ entries }: { entries: ApplicationHistoryEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        ) : (
          <ol className="space-y-5">
            {entries.map((entry) => {
              const meta = ACTION_META[entry.action] ?? { label: entry.action, icon: FileText };
              const Icon = meta.icon;
              return (
                <li key={entry.id} className="flex gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(entry.createdAt), "MMMM d, yyyy · h:mm a")}</p>
                    <p className="text-xs text-muted-foreground">by {entry.actorName}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
