"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { CampaignRequestReviewStatus } from "@prisma/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateCampaignRequestStatus } from "@/features/creator-library/services/campaign-request-admin.actions";

const STATUS_OPTIONS: { value: CampaignRequestReviewStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "COMPLETED", label: "Completed" },
];

export function CampaignRequestStatusSelect({ id, status }: { id: string; status: CampaignRequestReviewStatus }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await updateCampaignRequestStatus(id, value as CampaignRequestReviewStatus);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger size="sm" className="w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
