import { formatDistanceToNow } from "date-fns";
import {
  LogIn,
  LogOut,
  FolderPlus,
  DollarSign,
  Percent,
  UserPlus,
  DoorOpen,
  DoorClosed,
  MessageSquareText,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ACTION_META: Record<string, { icon: typeof Activity; label: string }> = {
  "member.checked_in": { icon: LogIn, label: "checked in" },
  "member.checked_out": { icon: LogOut, label: "checked out" },
  "project.created": { icon: FolderPlus, label: "created a project" },
  "gmv.entered": { icon: DollarSign, label: "logged GMV" },
  "commission.generated": { icon: Percent, label: "earned commission" },
  "project.assigned": { icon: UserPlus, label: "was assigned to a project" },
  "space.started": { icon: DoorOpen, label: "started a space session" },
  "space.finished": { icon: DoorClosed, label: "finished a space session" },
  "feedback.submitted": { icon: MessageSquareText, label: "submitted feedback" },
};

export function ActivityFeed({
  items,
}: {
  items: { id: string; action: string; memberName: string; createdAt: Date | string }[];
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-4">
            {items.map((item) => {
              const meta = ACTION_META[item.action] ?? { icon: Activity, label: item.action };
              const Icon = meta.icon;
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-3.5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{item.memberName}</span>{" "}
                      <span className="text-muted-foreground">{meta.label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
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
