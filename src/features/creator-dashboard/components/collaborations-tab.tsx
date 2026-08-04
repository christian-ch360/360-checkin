import { format } from "date-fns";
import { Handshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

type CollabRow = { id: string; title: string; createdAt: Date; applicationCount?: number };

function CollabGroup({ title, items }: { title: string; items: CollabRow[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {title} <span className="text-muted-foreground">({items.length})</span>
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={`${title}-${item.id}`}>
              <CardContent className="flex items-center justify-between gap-3 p-3.5">
                <p className="min-w-0 truncate text-sm font-medium">{item.title}</p>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {item.applicationCount != null
                    ? `${item.applicationCount} applicant${item.applicationCount === 1 ? "" : "s"}`
                    : format(item.createdAt, "MMM d")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollaborationsTab({
  collaborations,
}: {
  collaborations: { open: CollabRow[]; pending: CollabRow[]; accepted: CollabRow[]; completed: CollabRow[] };
}) {
  const total =
    collaborations.open.length + collaborations.pending.length + collaborations.accepted.length + collaborations.completed.length;

  if (total === 0) {
    return (
      <EmptyState
        icon={Handshake}
        title="No collaborations yet"
        description="Post a collab or apply to one in Collab Hub to see it here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <CollabGroup title="Open" items={collaborations.open} />
      <CollabGroup title="Pending" items={collaborations.pending} />
      <CollabGroup title="Accepted" items={collaborations.accepted} />
      <CollabGroup title="Completed" items={collaborations.completed} />
    </div>
  );
}
