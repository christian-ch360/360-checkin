"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import Link from "next/link";
import { format } from "date-fns";
import type { MemberRole, SubscriptionStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { CreditCard } from "lucide-react";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { SUBSCRIPTION_STATUS_META } from "@/features/membership-plans/config/subscription-status-meta";
import { statusToneClass } from "@/lib/utils/status-colors";
import { formatCurrency } from "@/lib/utils/format";
import { SubscriptionOverrideMenu } from "@/features/membership-management/components/subscription-override-menu";

export type MembershipManagementRow = {
  memberId: string;
  fullName: string;
  email: string;
  memberNumber: string;
  role: MemberRole;
  profilePhotoUrl: string | null;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  planName: string;
  planPriceCents: number;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function buildColumns(canOverride: boolean): ColumnDef<MembershipManagementRow>[] {
  const columns: ColumnDef<MembershipManagementRow>[] = [
    {
      accessorKey: "fullName",
      header: "Member",
      cell: ({ row }) => (
        <Link href={`/members/${row.original.memberId}`} className="flex items-center gap-3">
          <Avatar className="size-8">
            {row.original.profilePhotoUrl && (
              <AvatarImage src={row.original.profilePhotoUrl} alt={row.original.fullName} />
            )}
            <AvatarFallback className="text-xs">{initials(row.original.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{row.original.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{row.original.memberNumber}</p>
          </div>
        </Link>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <span className="text-sm">{ROLE_LABELS[row.original.role]}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = SUBSCRIPTION_STATUS_META[row.original.status];
        return (
          <Badge variant="outline" className={cn(statusToneClass[meta.tone])}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      id: "date",
      header: "Trial ends / Next billing",
      cell: ({ row }) => {
        const { status, trialEndsAt, currentPeriodEnd } = row.original;
        const date = status === "TRIALING" ? trialEndsAt : currentPeriodEnd;
        return <span className="text-sm text-muted-foreground">{date ? format(date, "MMM d, yyyy") : "—"}</span>;
      },
    },
    {
      id: "plan",
      header: "Plan",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.planName} · {formatCurrency(row.original.planPriceCents / 100)}/mo
        </span>
      ),
    },
  ];

  if (canOverride) {
    columns.push({
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <SubscriptionOverrideMenu memberId={row.original.memberId} status={row.original.status} />
        </div>
      ),
    });
  }

  return columns;
}

export function MembershipManagementTable({ data, canOverride }: { data: MembershipManagementRow[]; canOverride: boolean }) {
  const columns = buildColumns(canOverride);
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  if (data.length === 0) {
    return <EmptyState icon={CreditCard} title="No memberships found" description="Adjust your filters or search." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
