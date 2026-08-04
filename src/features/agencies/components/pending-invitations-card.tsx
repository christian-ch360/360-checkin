"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format, isPast } from "date-fns";
import { toast } from "sonner";
import { Loader2, Mail, RotateCw, X } from "lucide-react";
import type { AgencyInvitation } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { resendAgencyInvitationAction, revokeAgencyInvitationAction } from "@/features/agencies/services/agency-actions";

const ROLE_LABELS: Record<string, string> = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" };

/** "Allow resending and revoking invitations." Only ever shows PENDING rows — accepted/declined/
 * revoked invitations live in the Team Activity feed instead, not here. */
export function PendingInvitationsCard({ invitations }: { invitations: AgencyInvitation[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);

  const pending = invitations.filter((i) => i.status === "PENDING");

  function handleResend(invitation: AgencyInvitation) {
    setActingOn(invitation.id);
    startTransition(async () => {
      const result = await resendAgencyInvitationAction(invitation.id);
      setActingOn(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation resent to ${invitation.email}.`);
      router.refresh();
    });
  }

  function handleRevoke(invitation: AgencyInvitation) {
    setActingOn(invitation.id);
    startTransition(async () => {
      const result = await revokeAgencyInvitationAction(invitation.id);
      setActingOn(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Invitation to ${invitation.email} revoked.`);
      router.refresh();
    });
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2">
        <Mail className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm font-semibold">Pending Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <EmptyState icon={Mail} title="No pending invitations" description="Invite someone above to add them to your team." />
        ) : (
          <div className="space-y-2">
            {pending.map((invitation) => {
              const expired = isPast(invitation.expiresAt);
              const busy = isPending && actingOn === invitation.id;
              return (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{invitation.fullName}</span>
                      <Badge variant="outline" className="text-xs">
                        {ROLE_LABELS[invitation.role] ?? invitation.role}
                      </Badge>
                      {expired && (
                        <Badge variant="outline" className="text-xs text-destructive">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {invitation.email} · Expires {format(invitation.expiresAt, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleResend(invitation)} disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <RotateCw className="size-4" />}
                      Resend
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(invitation)}
                      disabled={busy}
                    >
                      <X className="size-4" />
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
