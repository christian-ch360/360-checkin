"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { X, RotateCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { revokeInvitation, resendInvitation } from "@/features/admin/services/actions";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<string, string> = {
  PENDING: statusToneClass.warning,
  ACCEPTED: statusToneClass.success,
  EXPIRED: statusToneClass.neutral,
  REVOKED: statusToneClass.error,
};

export function InvitationsList({
  invitations,
}: {
  invitations: { id: string; email: string; role: string; status: string; expiresAt: Date; createdAt: Date }[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Per-row pending id, not a blanket isPending — revoking one invite
  // shouldn't visually disable every other row's revoke button.
  const [pendingId, setPendingId] = useState<string | null>(null);

  function revoke(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await revokeInvitation(id);
      if (!result.success) toast.error(result.error);
      setPendingId(null);
      router.refresh();
    });
  }

  function resend(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await resendInvitation(id);
      if (!result.success) toast.error(result.error);
      else toast.success("Invitation resent");
      setPendingId(null);
      router.refresh();
    });
  }

  if (invitations.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No invitations sent yet.</p>;
  }

  return (
    <div className="divide-y">
      {invitations.map((inv) => (
        <div key={inv.id} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{inv.email}</p>
            <p className="text-xs text-muted-foreground">
              {inv.role.replaceAll("_", " ").toLowerCase()} · sent {format(inv.createdAt, "MMM d, yyyy")}
            </p>
          </div>
          <Badge variant="outline" className={STATUS_STYLES[inv.status]}>
            {inv.status.toLowerCase()}
          </Badge>
          {(inv.status === "PENDING" || inv.status === "EXPIRED") && (
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={pendingId === inv.id}
              onClick={() => resend(inv.id)}
              aria-label={`Resend invitation to ${inv.email}`}
            >
              <RotateCw className="size-3.5" />
            </Button>
          )}
          {inv.status === "PENDING" && (
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={pendingId === inv.id}
              onClick={() => revoke(inv.id)}
              aria-label={`Revoke invitation to ${inv.email}`}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
