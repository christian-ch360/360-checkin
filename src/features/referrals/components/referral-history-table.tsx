"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { ReferralStatus } from "@prisma/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReferralStatusBadge } from "@/features/referrals/components/referral-status-badge";

export type ReferralHistoryRow = {
  id: string;
  referrerName: string;
  referrerId: string;
  applicantName: string | null;
  referralCode: string;
  applicationDate: string;
  status: ReferralStatus;
  approvalDate: string | null;
  memberStatus: string | null;
};

export function ReferralHistoryTable({ data }: { data: ReferralHistoryRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Referrer</TableHead>
            <TableHead>Applicant</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Application Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Approval Date</TableHead>
            <TableHead>Member Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No referrals found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-sm font-medium">
                  <Link href={`/members/${row.referrerId}`} className="hover:underline">
                    {row.referrerName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.applicantName ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{row.referralCode}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(row.applicationDate), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <ReferralStatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {row.approvalDate ? format(new Date(row.approvalDate), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground capitalize">
                  {row.memberStatus?.toLowerCase() ?? "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
