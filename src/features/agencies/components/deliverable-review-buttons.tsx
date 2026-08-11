"use client";

import { useTransition } from "react";
import { Loader2, Check, X } from "lucide-react";
import { reviewDeliverable } from "@/features/agencies/services/campaign-actions";

export function DeliverableReviewButtons({ deliverableId }: { deliverableId: string }) {
  const [isPending, startTransition] = useTransition();

  function review(status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      await reviewDeliverable(deliverableId, status);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => review("APPROVED")}
        disabled={isPending}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-success/10 px-2.5 text-xs font-medium text-success transition-colors hover:bg-success/20 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
        Approve
      </button>
      <button
        type="button"
        onClick={() => review("REJECTED")}
        disabled={isPending}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        Send back
      </button>
    </div>
  );
}
