"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { MemberRole } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberStatusBadge } from "@/features/members/components/member-status-badge";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { ApplicationDetailDrawer } from "@/features/members/components/application-detail-drawer";

export type PendingMemberRow = {
  id: string;
  memberNumber: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: MemberRole;
  profilePhotoUrl: string | null;
  company: { id: string; name: string } | null;
  createdAt: string;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function PendingMembersTable({ data }: { data: PendingMemberRow[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Applicant</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Applied Role</TableHead>
              <TableHead>Date Applied</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No pending applications.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(row.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {row.profilePhotoUrl && <AvatarImage src={row.profilePhotoUrl} alt={row.fullName} />}
                        <AvatarFallback className="text-xs">{initials(row.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{row.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.memberNumber}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.phone ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.company?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{ROLE_LABELS[row.role]}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <MemberStatusBadge status="PENDING" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ApplicationDetailDrawer
        memberId={selectedId}
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onActioned={() => {
          setSelectedId(null);
          router.refresh();
        }}
      />
    </>
  );
}
