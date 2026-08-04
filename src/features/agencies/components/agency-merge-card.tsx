"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, GitMerge } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { mergeAgenciesAction } from "@/features/agencies/services/agency-actions";

/**
 * "Only Super Admins may merge duplicate agencies if one is accidentally
 * created." Shown on the *duplicate's* profile — the Super Admin enters the
 * real agency's Agency ID here, and this record is the one that gets merged
 * away (soft-deleted, its connected creators and pending requests moved to
 * the primary).
 */
export function AgencyMergeCard({ agency }: { agency: { id: string; fullName: string; referralCode: string | null } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [primaryCode, setPrimaryCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await mergeAgenciesAction(agency.id, primaryCode.trim());
      setConfirming(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${agency.fullName} was merged and is no longer active.`);
      router.push(`/members`);
    });
  }

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <GitMerge className="size-4 text-muted-foreground" />
            Merge Duplicate Agency
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            If {agency.fullName} is an accidental duplicate, merge it into the real agency below. Connected creators
            and any pending requests move over; this record is retired.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="merge-target-code">Primary Agency ID (the one to keep)</Label>
            <Input
              id="merge-target-code"
              placeholder="AGY-001284"
              value={primaryCode}
              onChange={(e) => setPrimaryCode(e.target.value.toUpperCase())}
              disabled={isPending}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={isPending || !primaryCode.trim() || primaryCode.trim() === agency.referralCode}
            onClick={() => setConfirming(true)}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Merge into this Agency ID
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merge {agency.fullName} into {primaryCode.trim()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This retires {agency.fullName}&apos;s Agency ID and reassigns every connected creator and open request to
              the target agency. This is logged to the audit trail and cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Confirm merge
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
