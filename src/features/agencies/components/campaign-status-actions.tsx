"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  submitCampaignForApproval,
  approveCampaign,
  completeCampaign,
  cancelCampaign,
  deleteCampaign,
} from "@/features/agencies/services/campaign-actions";
import type { CampaignStatus } from "@prisma/client";

const NEXT_ACTION: Partial<Record<CampaignStatus, { label: string; action: (id: string) => Promise<{ success: boolean; error?: string }>; requiresApprover?: boolean }>> = {
  DRAFT: { label: "Submit for approval", action: submitCampaignForApproval },
  PENDING_APPROVAL: { label: "Approve", action: approveCampaign, requiresApprover: true },
  ACTIVE: { label: "Mark complete", action: completeCampaign },
};

export function CampaignStatusActions({
  campaignId,
  status,
  canManage,
  canApprove,
  canDelete,
}: {
  campaignId: string;
  status: CampaignStatus;
  canManage: boolean;
  canApprove: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const next = NEXT_ACTION[status];
  const canAdvance = next && (next.requiresApprover ? canApprove : canManage);
  const canCancel = canManage && status !== "COMPLETED" && status !== "CANCELLED";

  function run(action: (id: string) => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action(campaignId);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {canAdvance && next && (
        <Button size="sm" disabled={isPending} onClick={() => run(next.action)}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          {next.label}
        </Button>
      )}
      {canCancel && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(cancelCampaign)}>
          Cancel
        </Button>
      )}
      {canDelete && (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Delete this campaign? This can't be undone.")) return;
            startTransition(async () => {
              const result = await deleteCampaign(campaignId);
              if (!result.success) {
                toast.error(result.error ?? "Something went wrong");
                return;
              }
              router.push("/agency/campaigns");
            });
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
