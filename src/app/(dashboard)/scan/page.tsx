import { requireCurrentMember } from "@/features/auth/services/current-member";
import { CheckinScannerPanel } from "@/features/checkin/components/checkin-scanner-panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Scan" };

export default async function ScanPage() {
  await requireCurrentMember();

  return (
    <div className="mx-auto max-w-[700px] space-y-4">
      <div className="text-center md:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Scan</h1>
        <p className="text-sm text-muted-foreground">Scan your CreatorHub360 QR code to check in.</p>
      </div>
      <CheckinScannerPanel />
    </div>
  );
}
