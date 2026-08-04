import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: statusToneClass.warning,
  IN_REVIEW: statusToneClass.info,
  RESOLVED: statusToneClass.success,
};

export function MyFeedbackList({
  items,
}: {
  items: { id: string; subject: string; status: string; createdAt: Date }[];
}) {
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Your submissions</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">You haven&apos;t submitted any feedback yet.</p>
        ) : (
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.subject}</p>
                  <p className="text-xs text-muted-foreground">{format(item.createdAt, "MMM d, yyyy")}</p>
                </div>
                <Badge variant="outline" className={STATUS_STYLES[item.status]}>
                  {STATUS_LABELS[item.status]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
