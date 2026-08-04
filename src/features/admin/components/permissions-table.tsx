"use client";

import { memo, useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SystemRole } from "@prisma/client";
import { updateMemberSystemRole } from "@/features/admin/services/actions";
import { SYSTEM_ROLE_LABELS, systemRoleValues } from "@/lib/permissions/member-rules";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Member = { id: string; fullName: string; email: string; systemRole: SystemRole };

const PermissionRow = memo(function PermissionRow({
  member,
  canEdit,
  pending,
  onChangeRole,
}: {
  member: Member;
  canEdit: boolean;
  pending: boolean;
  onChangeRole: (memberId: string, role: SystemRole) => void;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.fullName}</p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      <Select
        value={member.systemRole}
        onValueChange={(v) => onChangeRole(member.id, v as SystemRole)}
        disabled={!canEdit || pending}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {systemRoleValues.map((role) => (
            <SelectItem key={role} value={role}>
              {SYSTEM_ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
});

export function PermissionsTable({
  members,
  canEdit,
}: {
  members: Member[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Which single member's role change is in flight — not a blanket
  // isPending, so editing one row doesn't visually disable every other row.
  const [pendingId, setPendingId] = useState<string | null>(null);

  const changeRole = useCallback(
    (memberId: string, role: SystemRole) => {
      setPendingId(memberId);
      startTransition(async () => {
        const result = await updateMemberSystemRole(memberId, role);
        if (!result.success) toast.error(result.error);
        else toast.success("Permission updated");
        setPendingId(null);
        router.refresh();
      });
    },
    [router, startTransition]
  );

  return (
    <div className="divide-y">
      {members.map((m) => (
        <PermissionRow
          key={m.id}
          member={m}
          canEdit={canEdit}
          pending={pendingId === m.id}
          onChangeRole={changeRole}
        />
      ))}
    </div>
  );
}
