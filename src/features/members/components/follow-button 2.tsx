"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleFollowMember } from "@/features/members/services/follow-actions";

export function FollowButton({ memberId, initialFollowing }: { memberId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    setFollowing((prev) => !prev);
    startTransition(async () => {
      const result = await toggleFollowMember(memberId);
      if (!result.success) {
        toast.error(result.error);
        setFollowing((prev) => !prev);
        return;
      }
      setFollowing(result.following);
    });
  }

  return (
    <Button variant={following ? "outline" : "default"} size="sm" onClick={handleToggle} disabled={isPending}>
      {following ? (
        <>
          <UserCheck /> Following
        </>
      ) : (
        <>
          <UserPlus /> Follow
        </>
      )}
    </Button>
  );
}
