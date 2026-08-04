"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Building2, Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";
import { useSettingsFormDirty } from "@/features/settings/hooks/use-settings-form-dirty";
import { requestAgencyConnectionAction } from "@/features/referrals/services/referral-actions";
import type { CreatorAgencyStatus } from "@/features/referrals/services/referral.service";

/**
 * "Manual Agency ID Entry ... during Profile Settings" — the one entry
 * point where a Member already exists and is authenticated, so this posts
 * straight to requestAgencyConnectionAction (always MANUAL_ENTRY, always a
 * pending request — never an immediate connection, per the spec).
 */
export function AgencySection({ status }: { status: CreatorAgencyStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");

  useSettingsFormDirty(code.trim().length > 0);

  function handleSubmit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const result = await requestAgencyConnectionAction(trimmed);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.status === "PENDING" ? "Request sent to agency." : `Connected to ${result.agencyName}`);
      setCode("");
      router.refresh();
    });
  }

  return (
    <SettingsSectionCard
      id="agency"
      title="Agency"
      description="Connect your account to an agency using their Agency ID."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Status</span>
          {status.status === "CONNECTED" && (
            <Badge variant="outline" className="gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Connected to: {status.agencyName}
            </Badge>
          )}
          {status.status === "PENDING" && (
            <Badge variant="outline" className="gap-1.5 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="size-3.5" />
              Pending Agency Approval ({status.agencyName})
            </Badge>
          )}
          {status.status === "NONE" && (
            <Badge variant="outline" className="gap-1.5 text-muted-foreground">
              <Building2 className="size-3.5" />
              No Agency
            </Badge>
          )}
        </div>

        {status.status === "NONE" && (
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="settings-agency-code">Agency ID</Label>
            <div className="flex gap-2">
              <Input
                id="settings-agency-code"
                placeholder="AGY-001284"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={isPending}
              />
              <Button onClick={handleSubmit} disabled={isPending || !code.trim()}>
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Request
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The agency will need to approve your request before you&apos;re connected.
            </p>
          </div>
        )}

        {status.status === "PENDING" && (
          <p className="text-xs text-muted-foreground">
            Waiting on {status.agencyName} to review your request. You&apos;ll be notified once they respond.
          </p>
        )}
      </div>
    </SettingsSectionCard>
  );
}
