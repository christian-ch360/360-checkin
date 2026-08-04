"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import type { ContentCategory } from "@prisma/client";
import { updateCollabProfile } from "@/features/settings/services/actions";

type CollabProfileRest = {
  skills: string[];
  contentCategories: ContentCategory[];
  lookingFor: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
  visibleInDirectory: boolean;
};

export function CollabAvailabilityToggle({
  availableForCollab,
  profile,
}: {
  availableForCollab: boolean;
  profile: CollabProfileRest;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle(next: boolean) {
    startTransition(async () => {
      const result = await updateCollabProfile({
        skills: profile.skills.join(", "),
        contentCategories: profile.contentCategories,
        lookingFor: profile.lookingFor ?? "",
        instagramUrl: profile.instagramUrl ?? "",
        tiktokUrl: profile.tiktokUrl ?? "",
        youtubeUrl: profile.youtubeUrl ?? "",
        linkedinUrl: profile.linkedinUrl ?? "",
        availableForCollab: next,
        visibleInDirectory: profile.visibleInDirectory,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? "You're open for collaborations" : "Collaboration status updated");
      router.refresh();
    });
  }

  return (
    <label className="flex w-fit items-center gap-2.5 rounded-full border bg-muted/30 py-1.5 pr-3 pl-1.5 text-sm">
      <Switch checked={availableForCollab} disabled={isPending} onCheckedChange={toggle} />
      Open for collaborations
    </label>
  );
}
