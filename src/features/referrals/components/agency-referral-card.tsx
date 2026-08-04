"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AgencyReferralCard({ referralCode }: { referralCode: string }) {
  const qrSrc = `/api/referral-qr/${referralCode}`;
  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/apply?agency=${referralCode}`
      : `/apply?agency=${referralCode}`;
  const downloadName = `${referralCode.toLowerCase()}-qr.png`;

  function copyText(value: string, label: string) {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error(`Couldn't copy ${label.toLowerCase()}`));
  }

  async function handleShare() {
    const url = `${window.location.origin}/apply?agency=${referralCode}`;
    if (typeof navigator === "undefined" || !navigator.share) {
      copyText(url, "Referral link");
      return;
    }
    try {
      await navigator.share({ title: "Join CreatorHub360", text: "Apply using my agency referral link", url });
    } catch {
      // AbortError from the user canceling the native share sheet — expected, ignored.
    }
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Agency ID &amp; QR Code</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="overflow-hidden rounded-lg border bg-white p-2" style={{ width: 196, height: 196 }}>
          <Image src={qrSrc} alt={`QR code for ${referralCode}`} width={180} height={180} unoptimized priority />
        </div>

        <div className="text-center">
          <p className="font-mono text-xl font-semibold tracking-wide">{referralCode}</p>
          <p className="text-xs text-muted-foreground">Scanning this code opens /apply?agency={referralCode}</p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full" onClick={() => copyText(referralCode, "Agency ID")}>
            <Copy /> Copy Agency ID
          </Button>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={qrSrc} download={downloadName}>
              <Download /> Download QR Code
            </a>
          </Button>
          <Button variant="outline" size="sm" className="w-full" onClick={handleShare}>
            <Share2 /> Share Referral Link
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => copyText(referralUrl, "Referral link")}
          >
            <Copy /> Copy Referral Link
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
