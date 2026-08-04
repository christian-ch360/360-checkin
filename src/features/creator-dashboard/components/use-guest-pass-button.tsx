"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGuestPass as consumeGuestPass } from "@/features/members/services/membership-actions";

export function UseGuestPassButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onUse() {
    startTransition(async () => {
      const result = await consumeGuestPass();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.remaining == null ? "Guest pass used." : `Guest pass used — ${result.remaining} remaining today.`
      );
      router.refresh();
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={onUse} disabled={disabled || isPending}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus />}
      Use a guest pass
    </Button>
  );
}
