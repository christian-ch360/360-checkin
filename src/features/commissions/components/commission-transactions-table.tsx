"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/format";
import { approveCommission, markCommissionPaid } from "@/features/commissions/services/actions";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<string, string> = {
  PENDING: statusToneClass.warning,
  APPROVED: statusToneClass.info,
  PAID: statusToneClass.success,
  VOID: statusToneClass.neutral,
};

type Transaction = {
  id: string;
  tierCode: string;
  percentage: string;
  gmvAmount: string;
  commissionAmount: string;
  status: string;
  createdAt: Date;
  member: { id: string; fullName: string };
  project: { id: string; name: string } | null;
};

export function CommissionTransactionsTable({
  transactions,
  canManage,
}: {
  transactions: Transaction[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function approve(id: string) {
    startTransition(async () => {
      const result = await approveCommission(id);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  }

  function markPaid(id: string) {
    startTransition(async () => {
      const result = await markCommissionPaid(id);
      if (!result.success) toast.error(result.error);
      else toast.success("Marked as paid");
      router.refresh();
    });
  }

  if (transactions.length === 0) {
    return <EmptyState icon={Receipt} title="No commission transactions yet" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Member</TableHead>
          <TableHead>Project</TableHead>
          <TableHead className="text-right">GMV</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          <TableHead>Status</TableHead>
          {canManage && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="text-sm text-muted-foreground">{format(t.createdAt, "MMM d, yyyy")}</TableCell>
            <TableCell className="text-sm">
              <Link href={`/members/${t.member.id}`} className="font-medium hover:underline">
                {t.member.fullName}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{t.project?.name ?? "—"}</TableCell>
            <TableCell className="text-right text-sm">{formatCurrency(Number(t.gmvAmount))}</TableCell>
            <TableCell className="text-right text-sm font-medium">{formatCurrency(Number(t.commissionAmount))}</TableCell>
            <TableCell>
              <Badge variant="outline" className={STATUS_STYLES[t.status]}>
                {t.status.toLowerCase()}
              </Badge>
            </TableCell>
            {canManage && (
              <TableCell className="text-right">
                {t.status === "PENDING" && (
                  <Button size="sm" variant="outline" disabled={isPending} onClick={() => approve(t.id)}>
                    Approve
                  </Button>
                )}
                {t.status === "APPROVED" && (
                  <Button size="sm" disabled={isPending} onClick={() => markPaid(t.id)}>
                    Mark paid
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
