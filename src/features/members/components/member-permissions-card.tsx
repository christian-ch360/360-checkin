"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import type { SystemRole } from "@prisma/client";
import { updateMemberSystemRole } from "@/features/admin/services/actions";
import { RoleBadge } from "@/features/members/components/role-badge";
import {
  SYSTEM_ROLE_LABELS as ROLE_LABELS,
  STANDARD_SYSTEM_ROLES as STANDARD_ROLES,
} from "@/lib/permissions/member-rules";
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
  // Regular Admins never get an interactive Select, even disabled — they
  // must not see Admin/Super Admin as options at all, not just be blocked
  // from picking them. Only a Super Admin (canManageRoles) gets the dropdown.
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
            canManageRoles ? (
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
                {isSelf && (
                  <p className="text-xs text-muted-foreground">You can&apos;t change your own permissions.</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Only Super Admins can change permissions.</p>
            )
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
            <AlertDialogTitle>Change Member Role?</AlertDialogTitle>
            <AlertDialogDescription>You are about to change this member&apos;s platform role.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Old Role</span>
              <span className="font-medium">{ROLE_LABELS[member.systemRole]}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">New Role</span>
              <span className="font-medium">{pendingRole ? ROLE_LABELS[pendingRole] : ""}</span>
            </div>
            <p className="pt-1 text-xs text-muted-foreground">This affects permissions immediately.</p>
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingRole(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm Role Change
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
