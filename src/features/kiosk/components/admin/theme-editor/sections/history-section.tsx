import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EditableThemeVersion } from "../types";

export function HistorySection({
  versionHistory,
  latest,
  onRollbackRequest,
}: {
  versionHistory?: EditableThemeVersion[];
  latest?: EditableThemeVersion | null;
  onRollbackRequest: (version: number) => void;
}) {
  if (!versionHistory || versionHistory.length === 0) {
    return <p className="text-sm text-muted-foreground">No previous versions yet — history appears once you&rsquo;ve saved a draft.</p>;
  }

  return (
    <div className="space-y-2">
      {versionHistory.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
          <div>
            <span className="font-medium">Version {v.version}</span>{" "}
            <Badge variant="outline" className="ml-1">
              {v.status}
            </Badge>
            {v.publishedAt && <span className="ml-2 text-xs text-muted-foreground">{format(v.publishedAt, "MMM d, yyyy h:mm a")}</span>}
          </div>
          {latest && v.version !== latest.version && (
            <Button size="sm" variant="outline" onClick={() => onRollbackRequest(v.version)}>
              Roll Back to This
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
