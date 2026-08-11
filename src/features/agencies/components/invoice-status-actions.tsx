"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markInvoiceSent, markInvoicePaid, cancelInvoice } from "@/features/agencies/services/invoice-actions";
import type { InvoiceStatus } from "@prisma/client";

export function InvoiceStatusActions({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: (id: string) => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action(invoiceId);
      if (!result.success) {
        toast.error(result.error ?? "Something went wrong");
        return;
      }
      router.refresh();
    });
  }

  if (status === "PAID" || status === "CANCELLED") return null;

  return (
    <div className="flex items-center gap-1.5">
      {status === "DRAFT" && (
        <Button size="sm" variant="outline" disabled={isPending} onClick={() => run(markInvoiceSent)}>
          {isPending && <Loader2 className="size-3 animate-spin" />}
          Mark sent
        </Button>
      )}
      {(status === "SENT" || status === "OVERDUE") && (
        <Button size="sm" disabled={isPending} onClick={() => run(markInvoicePaid)}>
          {isPending && <Loader2 className="size-3 animate-spin" />}
          Mark paid
        </Button>
      )}
      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={isPending} onClick={() => run(cancelInvoice)}>
        Cancel
      </Button>
    </div>
  );
}
