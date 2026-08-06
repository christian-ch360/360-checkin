"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpDown } from "lucide-react";
import type { MemberRole, MemberStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberStatusBadge } from "@/features/members/components/member-status-badge";
import { TierBadge } from "@/features/members/components/tier-badge";
import { FollowerBadges } from "@/features/integrations/components/follower-badges";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { formatCompactCurrency, formatHours } from "@/lib/utils/format";
import type { SocialSummaryEntry } from "@/features/integrations/services/social-connections.service";

export type MemberRow = {
  id: string;
  memberNumber: string;
  fullName: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  profilePhotoUrl: string | null;
  currentGMV: string;
  hoursWorked: string;
  company: { id: string; name: string } | null;
  commissionTier: { code: string; name: string; percentage: string } | null;
  socialSummary: SocialSummaryEntry[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const columns: ColumnDef<MemberRow>[] = [
  {
    accessorKey: "fullName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Member <ArrowUpDown className="size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <Link href={`/members/${row.original.id}`} className="flex items-center gap-3">
        <Avatar className="size-8">
          {row.original.profilePhotoUrl && (
            <AvatarImage src={row.original.profilePhotoUrl} alt={row.original.fullName} />
          )}
          <AvatarFallback className="text-xs">{initials(row.original.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.original.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.memberNumber}</p>
          <FollowerBadges summary={row.original.socialSummary} className="mt-0.5" />
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
    id: "company",
    header: "Company",
    accessorFn: (row) => row.company?.name ?? "",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.company?.name ?? "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
  },
  {
    id: "tier",
    header: "Tier",
    cell: ({ row }) =>
      row.original.commissionTier ? (
        <TierBadge code={row.original.commissionTier.code} percentage={row.original.commissionTier.percentage} />
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "currentGMV",
    header: () => <div className="text-right">Current GMV</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm font-medium">
        {formatCompactCurrency(Number(row.original.currentGMV))}
      </div>
    ),
  },
  {
    accessorKey: "hoursWorked",
    header: () => <div className="text-right">Hours</div>,
    cell: ({ row }) => (
      <div className="text-right text-sm text-muted-foreground">
        {formatHours(Number(row.original.hoursWorked))}
      </div>
    ),
  },
];

export function MembersTable({ data }: { data: MemberRow[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="hidden overflow-x-auto rounded-lg border bg-card md:block">
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
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No members found.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
