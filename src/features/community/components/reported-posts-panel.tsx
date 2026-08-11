"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewCommunityReport } from "@/features/community/services/community-moderation-actions";

type Report = {
  id: string;
  reason: string;
  createdAt: Date;
  post: { id: string; body: string; author: { fullName: string } };
  reporter: { fullName: string };
};

export function ReportedPostsPanel({ reports }: { reports: Report[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function review(reportId: string, status: "REVIEWED" | "DISMISSED") {
    setBusyId(reportId);
    const result = await reviewCommunityReport(reportId, status);
    setBusyId(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  if (reports.length === 0) return null;

  return (
    <Card className="border-warning/40 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Flag className="size-4" /> Reported posts ({reports.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="rounded-lg border bg-card p-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Reported by {r.reporter.fullName} · post by {r.post.author.fullName}
            </p>
            <p className="mt-1 line-clamp-2 text-muted-foreground">&ldquo;{r.post.body}&rdquo;</p>
            <p className="mt-1 font-medium">Reason: {r.reason}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => review(r.id, "DISMISSED")} disabled={busyId === r.id}>
                Dismiss
              </Button>
              <Button size="sm" onClick={() => review(r.id, "REVIEWED")} disabled={busyId === r.id}>
                Mark reviewed
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
