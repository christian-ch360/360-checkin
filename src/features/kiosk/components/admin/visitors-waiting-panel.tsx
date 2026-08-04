"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { UserCheck, LogOut } from "lucide-react";
import type { Visitor } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveVisitor, checkOutVisitor } from "@/features/visitors/services/visitor-actions";

const VISITOR_TYPE_LABELS: Record<Visitor["visitorType"], string> = {
  BRAND: "Brand",
  CREATOR: "Creator",
  AGENCY: "Agency",
  VENDOR: "Vendor",
  BROKER: "Broker",
  MEDIA: "Media",
  INTERVIEW: "Interview",
  GUEST: "Guest",
  OTHER: "Other",
};

function VisitorRow({ visitor, action }: { visitor: Visitor; action: "approve" | "checkout" }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAction() {
    startTransition(async () => {
      const result = action === "approve" ? await approveVisitor(visitor.id) : await checkOutVisitor(visitor.id);
      if (!result.success) toast.error(result.error ?? "Something went wrong.");
      else toast.success(action === "approve" ? "Visitor approved" : "Visitor checked out");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {visitor.firstName} {visitor.lastName}
        </p>
        <p className="text-xs text-muted-foreground">
          {visitor.company || "—"} · {visitor.reasonForVisit}
        </p>
      </div>
      <Badge variant="outline">{VISITOR_TYPE_LABELS[visitor.visitorType]}</Badge>
      <Badge variant="outline" className="shrink-0 border-primary/20 bg-primary/10 text-primary">
        {formatDistanceToNowStrict(visitor.arrivedAt)}
      </Badge>
      <Button
        size="sm"
        variant={action === "approve" ? "default" : "outline"}
        disabled={isPending}
        onClick={handleAction}
      >
        {action === "approve" ? <UserCheck /> : <LogOut />}
        {action === "approve" ? "Approve" : "Check out"}
      </Button>
    </div>
  );
}

export function VisitorsWaitingPanel({
  waitingVisitors,
  onSiteVisitors,
}: {
  waitingVisitors: Visitor[];
  onSiteVisitors: Visitor[];
}) {
  if (waitingVisitors.length === 0 && onSiteVisitors.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No visitors waiting or on-site.</p>;
  }

  return (
    <div className="space-y-4">
      {waitingVisitors.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Waiting</p>
          <div className="divide-y">
            {waitingVisitors.map((v) => (
              <VisitorRow key={v.id} visitor={v} action="approve" />
            ))}
          </div>
        </div>
      )}
      {onSiteVisitors.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">On-site</p>
          <div className="divide-y">
            {onSiteVisitors.map((v) => (
              <VisitorRow key={v.id} visitor={v} action="checkout" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
