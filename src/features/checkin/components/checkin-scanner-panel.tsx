"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRScanner } from "@/features/qr/components/qr-scanner";
import { checkInByToken } from "@/features/checkin/services/actions";
import { formatDuration } from "@/lib/utils/format";

export function CheckinScannerPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastToken, setLastToken] = useState<string | null>(null);

  const handleScan = useCallback(
    (token: string) => {
      if (isPending || token === lastToken) return;
      setLastToken(token);

      startTransition(async () => {
        const result = await checkInByToken(token);

        if ("error" in result) {
          toast.error(result.error);
        } else if (result.action === "checked_in") {
          toast.success(`${result.memberName} checked in`);
        } else {
          toast.success(`${result.memberName} checked out · ${formatDuration(result.durationMinutes)}`);
        }

        router.refresh();
        setTimeout(() => setLastToken(null), 2000);
      });
    },
    [isPending, lastToken, router]
  );

  return <QRScanner onScan={handleScan} />;
}
