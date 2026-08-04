import { format } from "date-fns";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/format";

export function GMVTransactionsTable({
  transactions,
}: {
  transactions: {
    id: string;
    amount: string;
    transactionDate: Date;
    description: string | null;
    member: { id: string; fullName: string };
    project: { id: string; name: string } | null;
    company: { name: string } | null;
    brand: { name: string } | null;
  }[];
}) {
  if (transactions.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No GMV recorded yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Member</TableHead>
          <TableHead>Project</TableHead>
          <TableHead>Brand / Company</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="text-sm text-muted-foreground">{format(t.transactionDate, "MMM d, yyyy")}</TableCell>
            <TableCell className="text-sm">
              <Link href={`/members/${t.member.id}`} className="font-medium hover:underline">
                {t.member.fullName}
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {t.project ? (
                <Link href={`/projects/${t.project.id}`} className="hover:underline">
                  {t.project.name}
                </Link>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {t.brand?.name ?? t.company?.name ?? "—"}
            </TableCell>
            <TableCell className="text-right text-sm font-medium">{formatCurrency(Number(t.amount))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
