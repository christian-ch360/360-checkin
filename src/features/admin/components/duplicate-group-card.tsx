"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { resolveDuplicateGroupAction } from "@/features/admin/services/duplicate-resolution.actions";
import type { ResolvableDuplicateGroup } from "@/features/admin/services/duplicate-resolution.service";

/**
 * One duplicate-email group's resolution card. Every path through here goes
 * through the same resolveDuplicateGroupAction — "Keep Approved + Mark
 * Pending Duplicate" (Case A) and "Keep This Application" (Case B/C) are
 * both just that action with a different keep id, always explicitly
 * clicked by an admin, never applied on page load.
 */
export function DuplicateGroupCard({ group }: { group: ResolvableDuplicateGroup }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  function resolve(keepApplicationId: string) {
    const markIds = group.applications.filter((a) => a.id !== keepApplicationId).map((a) => a.id);
    setResolvingId(keepApplicationId);
    startTransition(async () => {
      const result = await resolveDuplicateGroupAction(keepApplicationId, markIds, note);
      if (!result.success) {
        toast.error(result.error);
        setResolvingId(null);
        return;
      }
      toast.success("Duplicate resolved.");
      router.refresh();
    });
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-medium">{group.email}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {group.caseType === "approved_pending" && (
          <div className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
            <div>
              <p className="font-medium">Recommended</p>
              <p className="text-muted-foreground">
                An approved application already exists. The pending application appears to be a duplicate.
              </p>
            </div>
          </div>
        )}
        {group.caseType === "different_names" && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            <div>
              <p className="font-medium">Manual review required</p>
              <p className="text-muted-foreground">
                Multiple applicants with different names are associated with this email. Inspect each application before deciding.
              </p>
            </div>
          </div>
        )}
        {group.caseType === "multiple_pending" && (
          <p className="text-sm text-muted-foreground">
            All applications for this email are still pending. Review each one and choose which to keep.
          </p>
        )}

        <div className="space-y-2">
          {group.applications.map((application) => (
            <div key={application.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{application.fullName}</p>
                <p className="text-xs text-muted-foreground">Submitted {format(application.createdAt, "MMM d, yyyy h:mm a")}</p>
              </div>
              <div className="flex items-center gap-2">
                <ApplicationStatusBadge status={application.status} />
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/admin/applications/${application.id}`}>Review</Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => resolve(application.id)}
                  disabled={isPending}
                >
                  {isPending && resolvingId === application.id && <Loader2 className="size-3.5 animate-spin" />}
                  {group.caseType === "approved_pending" && application.status === "APPROVED"
                    ? "Keep Approved + Mark Pending Duplicate"
                    : "Keep This Application"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Input
          placeholder="Optional note (e.g. why this one was kept)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={isPending}
          className="text-sm"
        />
      </CardContent>
    </Card>
  );
}
