"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, IdCard, Printer, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberQrSection } from "@/features/qr/components/member-qr-section";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";
import { downloadMemberCard } from "@/features/settings/services/member-card";
import { PrintBadgeDialog } from "@/features/settings/components/print-badge-dialog";

export function QrCodeSection({
  memberId,
  token,
  fullName,
  memberNumber,
  role,
  tierCode,
  organizationName,
}: {
  memberId: string;
  token: string;
  fullName: string;
  memberNumber: string;
  role: string;
  tierCode: string | null;
  organizationName: string;
}) {
  const [isDownloading, startDownload] = useTransition();
  const [printOpen, setPrintOpen] = useState(false);

  function handleDownloadCard() {
    startDownload(async () => {
      try {
        await downloadMemberCard({ fullName, memberNumber, role, tierCode, organizationName, qrToken: token });
      } catch {
        toast.error("Couldn't generate the member card");
      }
    });
  }

  return (
    <SettingsSectionCard
      title="My QR Code"
      description="Your permanent CreatorHub360 identity — used for check-in and building access."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <MemberQrSection
          memberId={memberId}
          token={token}
          fullName={fullName}
          memberNumber={memberNumber}
          canManage
          variant="desktop"
        />
        <div className="flex flex-1 flex-col gap-2 sm:pt-2">
          <Button variant="outline" onClick={handleDownloadCard} disabled={isDownloading}>
            {isDownloading ? <Loader2 className="size-4 animate-spin" /> : <IdCard />}
            Download Member Card
          </Button>
          <Button variant="outline" onClick={() => setPrintOpen(true)}>
            <Printer /> Print Badge
          </Button>

          <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              This QR code is tied to {memberNumber} and only readable by CreatorHub360&rsquo;s check-in and
              building-access scanners — it doesn&rsquo;t expose your personal details to whoever scans it.
              Refreshing it immediately invalidates the old code everywhere it&rsquo;s been printed, saved, or
              added to a wallet, so only do that if you believe it&rsquo;s been compromised or lost.
            </p>
          </div>
        </div>
      </div>

      <PrintBadgeDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        fullName={fullName}
        memberNumber={memberNumber}
        role={role}
        organizationName={organizationName}
        qrToken={token}
      />
    </SettingsSectionCard>
  );
}
