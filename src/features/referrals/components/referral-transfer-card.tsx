"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { transferReferralAction } from "@/features/referrals/services/referral-actions";

export function ReferralTransferCard({
  member,
  currentAgency,
  canTransfer,
}: {
  member: { id: string; fullName: string };
  currentAgency: { id: string; fullName: string; referralCode: string | null } | null;
  /** Super Admin only — "Creators cannot change their Agency ID after
   * approval unless a Super Admin authorizes the transfer." */
  canTransfer: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newCode, setNewCode] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await transferReferralAction(member.id, newCode.trim() || null, reason);
      setConfirming(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Agency assignment updated");
      setNewCode("");
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="size-4 text-muted-foreground" />
            Agency Assignment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Currently connected to</span>
            <span className="font-medium">
              {currentAgency ? `${currentAgency.fullName} (${currentAgency.referralCode})` : "No agency"}
            </span>
          </div>

          {canTransfer ? (
            <div className="space-y-2 border-t pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="transfer-code">New Agency ID (leave blank to disconnect)</Label>
                <Input
                  id="transfer-code"
                  placeholder="AGY-001284"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  disabled={isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transfer-reason">Reason (required, logged)</Label>
                <Textarea
                  id="transfer-reason"
                  placeholder="Why is this assignment changing?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isPending}
                  rows={2}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={isPending || !reason.trim()}
                onClick={() => setConfirming(true)}
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Update Assignment
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Only Super Admins can transfer an agency assignment.</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {newCode.trim() ? `Reassign ${member.fullName} to ${newCode.trim()}?` : `Disconnect ${member.fullName} from their agency?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This change is logged to the audit trail and takes effect immediately. It won&apos;t affect GMV already
              recorded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
