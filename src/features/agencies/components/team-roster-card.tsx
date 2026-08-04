"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Crown, Loader2, LogOut, Trash2, Users2 } from "lucide-react";
import type { AgencyMemberRole } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  removeTeamMemberAction,
  updateTeamMemberRoleAction,
  leaveAgencyAction,
} from "@/features/agencies/services/agency-actions";
import { canManageTeamMember, canTransferOwnership } from "@/features/agencies/config/agency-permissions";
import type { AgencyTeamMember } from "@/features/agencies/services/agency-access.service";
import { TransferOwnershipDialog } from "@/features/agencies/components/transfer-ownership-dialog";

const ROLE_LABELS: Record<string, string> = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function TeamRosterCard({
  team,
  currentMemberId,
  actorRole,
}: {
  team: AgencyTeamMember[];
  currentMemberId: string;
  actorRole: AgencyMemberRole | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AgencyTeamMember | null>(null);
  const [leavingOpen, setLeavingOpen] = useState(false);
  const [transferTarget, setTransferTarget] = useState<AgencyTeamMember | null>(null);

  const isOwner = actorRole === "OWNER";

  function handleRoleChange(member: AgencyTeamMember, newRole: AgencyMemberRole) {
    setActingOn(member.id);
    startTransition(async () => {
      const result = await updateTeamMemberRoleAction(member.id, newRole);
      setActingOn(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${member.fullName} is now ${ROLE_LABELS[newRole]}.`);
      router.refresh();
    });
  }

  function handleRemove() {
    if (!removing) return;
    const target = removing;
    setActingOn(target.id);
    startTransition(async () => {
      const result = await removeTeamMemberAction(target.id);
      setActingOn(null);
      setRemoving(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${target.fullName} was removed from the team.`);
      router.refresh();
    });
  }

  function handleLeave() {
    setActingOn(currentMemberId);
    startTransition(async () => {
      const result = await leaveAgencyAction();
      setActingOn(null);
      setLeavingOpen(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("You left the agency.");
      router.refresh();
    });
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2">
          <Users2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {team.map((member) => {
            const isSelf = member.id === currentMemberId;
            const canManage = actorRole ? canManageTeamMember(actorRole, member.role) : false;
            const busy = isPending && actingOn === member.id;
            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">{initials(member.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{member.fullName}</span>
                      {member.isCanonical && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                      {isSelf && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                      {member.status !== "ACTIVE" && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          {member.status}
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {canManage && !isSelf ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member, value as AgencyMemberRole)}
                      disabled={busy}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isOwner && <SelectItem value="OWNER">Owner</SelectItem>}
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  )}

                  {isOwner &&
                    !isSelf &&
                    member.status === "ACTIVE" &&
                    canTransferOwnership(actorRole) &&
                    (member.role === "OWNER" || member.role === "MANAGER") && (
                      <Button size="sm" variant="outline" onClick={() => setTransferTarget(member)} disabled={busy}>
                        Transfer Ownership
                      </Button>
                    )}

                  {isSelf ? (
                    <Button size="sm" variant="outline" onClick={() => setLeavingOpen(true)} disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                      Leave
                    </Button>
                  ) : (
                    canManage && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRemoving(member)}
                        disabled={busy}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                        Remove
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.fullName} from the team?</AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll lose access to this agency&apos;s creators, analytics, and settings immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={leavingOpen} onOpenChange={setLeavingOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this agency?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll lose access to this agency&apos;s creators, analytics, and settings. This can&apos;t be undone
              from here — you&apos;d need a new invitation to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Leave agency
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransferOwnershipDialog target={transferTarget} onOpenChange={(open) => !open && setTransferTarget(null)} />
    </>
  );
}
