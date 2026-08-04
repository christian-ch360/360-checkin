"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import type { SystemRole } from "@prisma/client";
import { updateMemberSystemRole } from "@/features/admin/services/actions";
import { RoleBadge } from "@/features/members/components/role-badge";
import { SYSTEM_ROLE_LABELS as ROLE_LABELS, STANDARD_SYSTEM_ROLES as STANDARD_ROLES } from "@/lib/permissions/member-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PROMOTE_COPY: Record<string, string> = {
  "MEMBER->ADMIN": "This will grant administrative access.",
  "ADMIN->SUPER_ADMIN": "This will grant full administrative access, including the ability to manage other admins.",
  "MEMBER->SUPER_ADMIN": "This will grant full administrative access, including the ability to manage other admins.",
};

const DEMOTE_COPY: Record<string, string> = {
  "ADMIN->MEMBER": "This will remove their administrative access.",
  "SUPER_ADMIN->ADMIN": "This will remove their ability to manage other admins.",
  "SUPER_ADMIN->MEMBER": "This will remove all administrative access.",
};

const ROLE_RANK: Record<SystemRole, number> = {
  MEMBER: 0,
  GUEST: 0,
  PROJECT_LEADER: 0,
  MANAGER: 0,
  ADMIN: 1,
  SUPER_ADMIN: 2,
};

export function MemberPermissionsCard({
  member,
  canManageRoles,
  isSelf,
}: {
  member: { id: string; fullName: string; systemRole: SystemRole };
  canManageRoles: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingRole, setPendingRole] = useState<SystemRole | null>(null);

  const isStandardRole = STANDARD_ROLES.includes(member.systemRole);
  const canEdit = canManageRoles && !isSelf && isStandardRole;

  function onConfirm() {
    if (!pendingRole) return;
    const nextRole = pendingRole;
    startTransition(async () => {
      const result = await updateMemberSystemRole(member.id, nextRole);
      if (!result.success) {
        toast.error(result.error);
        setPendingRole(null);
        return;
      }
      toast.success("Permission updated");
      setPendingRole(null);
      router.refresh();
    });
  }

  const isPromotion = pendingRole ? ROLE_RANK[pendingRole] > ROLE_RANK[member.systemRole] : false;
  const copyKey = pendingRole ? `${member.systemRole}->${pendingRole}` : "";
  const dialogCopy = pendingRole
    ? (isPromotion ? PROMOTE_COPY[copyKey] : DEMOTE_COPY[copyKey]) ??
      `${member.fullName}'s role will change from ${ROLE_LABELS[member.systemRole]} to ${ROLE_LABELS[pendingRole]}.`
    : "";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-4 text-muted-foreground" />
            Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">User role</p>
            <RoleBadge role={member.systemRole} />
          </div>

          {isStandardRole ? (
            <>
              <Select
                value={member.systemRole}
                onValueChange={(v) => setPendingRole(v as SystemRole)}
                disabled={!canEdit || isPending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STANDARD_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!canManageRoles && (
                <p className="text-xs text-muted-foreground">Only Super Admins can change permissions.</p>
              )}
              {canManageRoles && isSelf && (
                <p className="text-xs text-muted-foreground">You can&apos;t change your own permissions.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              This member has a legacy role not managed here. Use the full{" "}
              <a href="/admin?tab=permissions" className="font-medium text-primary underline underline-offset-4">
                Permissions table
              </a>{" "}
              in Admin to change it.
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingRole !== null} onOpenChange={(open) => !open && setPendingRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPromotion ? "Promote" : "Demote"} {member.fullName} to {pendingRole ? ROLE_LABELS[pendingRole] : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>{dialogCopy}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingRole(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
