"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Camera, Music2, Video } from "lucide-react";
import type { MemberRole, MembershipApplicationStatus } from "@prisma/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { ROLE_LABELS } from "@/features/members/role-labels";

export type ApplicationRow = {
  id: string;
  fullName: string;
  email: string;
  role: MemberRole;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  status: MembershipApplicationStatus;
  createdAt: string;
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ApplicationsTable({ data }: { data: ApplicationRow[] }) {
  const router = useRouter();

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Applicant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Social</TableHead>
            <TableHead>Applied Date</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No applications found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/admin/applications/${row.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs">{initials(row.fullName)}</AvatarFallback>
                    </Avatar>
                    <p className="truncate text-sm font-medium">{row.fullName}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.email}</TableCell>
                <TableCell className="text-sm">{ROLE_LABELS[row.role]}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {row.instagram && <Camera className="size-3.5" />}
                    {row.tiktok && <Music2 className="size-3.5" />}
                    {row.youtube && <Video className="size-3.5" />}
                    {!row.instagram && !row.tiktok && !row.youtube && <span className="text-sm">—</span>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(row.createdAt), "MMM d, yyyy")}
                </TableCell>
                <TableCell>
                  <ApplicationStatusBadge status={row.status} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
