"use client";

import { toast } from "sonner";
import { Copy, Users, FileText, CheckCircle2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type ReferralCardStats = {
  referralCode: string | null;
  referralCodeDisabled: boolean;
  totalReferrals: number;
  applications: number;
  approved: number;
  activeMembers: number;
};

function copyText(value: string, label: string) {
  navigator.clipboard
    .writeText(value)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error(`Couldn't copy ${label.toLowerCase()}`));
}

/**
 * The general "every eligible member can share a referral link" section —
 * used on the Member Profile (and, once self-viewed, doubles as that
 * member's own referral dashboard) for any referral-eligible role, not just
 * Agency. AgencyReferralCard stays as-is for the Agency-specific "Agency ID &
 * QR Code" surfaces already shipped; this is the generic counterpart.
 */
export function ReferralCard({ stats }: { stats: ReferralCardStats }) {
  if (!stats.referralCode) return null;

  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/apply?ref=${stats.referralCode}`
      : `/apply?ref=${stats.referralCode}`;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">Referrals</CardTitle>
        {stats.referralCodeDisabled && <Badge variant="destructive">Disabled</Badge>}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Referral Code</p>
          <p className="font-mono text-lg font-semibold tracking-wide">{stats.referralCode}</p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Referral Link</p>
          <p className="truncate text-sm text-muted-foreground">/apply?ref={stats.referralCode}</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={stats.referralCodeDisabled}
          onClick={() => copyText(referralUrl, "Referral link")}
        >
          <Copy /> Copy Link
        </Button>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Users className="size-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{stats.totalReferrals}</p>
              <p className="text-[11px] text-muted-foreground">Total Referrals</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <FileText className="size-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{stats.applications}</p>
              <p className="text-[11px] text-muted-foreground">Applications</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <CheckCircle2 className="size-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{stats.approved}</p>
              <p className="text-[11px] text-muted-foreground">Approved</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <UserCheck className="size-3.5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">{stats.activeMembers}</p>
              <p className="text-[11px] text-muted-foreground">Active Members</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
