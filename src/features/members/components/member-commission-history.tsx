import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/format";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<string, string> = {
  PENDING: statusToneClass.warning,
  APPROVED: statusToneClass.info,
  PAID: statusToneClass.success,
  VOID: statusToneClass.neutral,
};

export function MemberCommissionHistory({
  transactions,
}: {
  transactions: {
    id: string;
    tierCode: string;
    percentage: string;
    gmvAmount: string;
    commissionAmount: string;
    status: string;
    createdAt: Date;
    project: { name: string } | null;
  }[];
}) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No commission history yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Tier</TableHead>
          <TableHead className="text-right">GMV</TableHead>
          <TableHead className="text-right">Commission</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="text-sm">{format(t.createdAt, "MMM d, yyyy")}</TableCell>
            <TableCell className="text-sm">{t.project?.name ?? "—"}</TableCell>
            <TableCell className="text-sm">
              Tier {t.tierCode} ({t.percentage}%)
            </TableCell>
            <TableCell className="text-right text-sm">{formatCurrency(Number(t.gmvAmount))}</TableCell>
            <TableCell className="text-right text-sm font-medium">
              {formatCurrency(Number(t.commissionAmount))}
            </TableCell>
            <TableCell>
              <Badge variant="outline" className={STATUS_STYLES[t.status]}>
                {t.status.toLowerCase()}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
