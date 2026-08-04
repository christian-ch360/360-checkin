"use client";

import { useState } from "react";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { format } from "date-fns";
import type { MemberRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { ShieldCheck } from "lucide-react";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { statusToneClass } from "@/lib/utils/status-colors";
import { COMPLIANCE_STATUS_META } from "@/features/legal/config/compliance-status-meta";
import type { ComplianceRow, DocumentComplianceEntry } from "@/features/legal/services/compliance.service";
import { MemberDetailSheet } from "@/features/legal/components/admin/member-detail-sheet";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function DocVersionCell({ doc }: { doc: DocumentComplianceEntry }) {
  if (!doc.acceptedVersion) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className={cn("text-xs", !doc.compliant && "font-medium text-amber-600 dark:text-amber-400")}>
      v{doc.acceptedVersion}
    </span>
  );
}

const columns: ColumnDef<ComplianceRow>[] = [
  {
    accessorKey: "fullName",
    header: "Member",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="size-8">
          <AvatarFallback className="text-xs">{initials(row.original.fullName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.original.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.email}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <span className="text-sm">{ROLE_LABELS[row.original.role as MemberRole]}</span>,
  },
  {
    id: "terms",
    header: "Terms",
    cell: ({ row }) => <DocVersionCell doc={row.original.documents.TERMS} />,
  },
  {
    id: "privacy",
    header: "Privacy",
    cell: ({ row }) => <DocVersionCell doc={row.original.documents.PRIVACY} />,
  },
  {
    id: "media",
    header: "Media",
    cell: ({ row }) => <DocVersionCell doc={row.original.documents.MEDIA_RELEASE} />,
  },
  {
    id: "liability",
    header: "Liability",
    cell: ({ row }) => <DocVersionCell doc={row.original.documents.LIABILITY_RELEASE} />,
  },
  {
    id: "acceptedAt",
    header: "Accepted At",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.lastAcceptedAt ? format(row.original.lastAcceptedAt, "MMM d, yyyy") : "—"}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => {
      const meta = COMPLIANCE_STATUS_META[row.original.status];
      return (
        <Badge variant="outline" className={statusToneClass[meta.tone]}>
          {meta.label}
        </Badge>
      );
    },
  },
];

export function ComplianceTable({ data, canForceReaccept }: { data: ComplianceRow[]; canForceReaccept: boolean }) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  if (data.length === 0) {
    return <EmptyState icon={ShieldCheck} title="No members found" description="Adjust your filters or search." />;
  }

  return (
    <>
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
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => setSelectedMemberId(row.original.memberId)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <MemberDetailSheet
        memberId={selectedMemberId}
        open={!!selectedMemberId}
        onOpenChange={(o) => !o && setSelectedMemberId(null)}
        canForceReaccept={canForceReaccept}
      />
    </>
  );
}
