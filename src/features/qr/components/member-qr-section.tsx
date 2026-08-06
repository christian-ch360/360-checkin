"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Maximize2, Download, Copy, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QRFullscreenView } from "@/features/qr/components/qr-fullscreen-view";
import { regenerateMemberQR } from "@/features/qr/services/qr-actions";

export function MemberQrSection({
  memberId,
  token,
  fullName,
  memberNumber,
  canManage,
  variant,
}: {
  memberId: string;
  token: string;
  fullName: string;
  memberNumber: string;
  canManage: boolean;
  variant: "desktop" | "mobile";
}) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const src = `/api/qr/${token}`;
  const downloadName = `${fullName.replace(/\s+/g, "-").toLowerCase()}-qr.png`;

  function copyMemberId() {
    navigator.clipboard
      .writeText(memberNumber)
      .then(() => toast.success("Member ID copied"))
      .catch(() => toast.error("Couldn't copy member ID"));
  }

  async function handleShare() {
    if (typeof navigator === "undefined" || !navigator.share) {
      toast.info("Sharing isn't supported on this device");
      return;
    }

    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], downloadName, { type: blob.type });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: `${fullName}'s QR code`, files: [file] });
        return;
      }
    } catch {
      // Falls through to a link share below — the image fetch/File share
      // path can fail on browsers with partial Web Share support.
    }

    try {
      await navigator.share({ title: `${fullName}'s QR code`, url: `${window.location.origin}${src}` });
    } catch {
      // AbortError from the user canceling the native share sheet is
      // expected and not an error worth surfacing.
    }
  }

  function handleRegenerate() {
    startTransition(async () => {
      const result = await regenerateMemberQR(memberId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("QR code regenerated — the previous code no longer works");
    });
  }

  const isMobile = variant === "mobile";

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">My QR</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div
            className="overflow-hidden rounded-lg border bg-white p-2"
            style={{ width: (isMobile ? 220 : 180) + 16, height: (isMobile ? 220 : 180) + 16 }}
          >
            <Image
              src={src}
              alt={`QR code for ${fullName}`}
              width={isMobile ? 220 : 180}
              height={isMobile ? 220 : 180}
              unoptimized
              priority={isMobile}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{fullName}</p>
            <p className="text-xs text-muted-foreground">{memberNumber}</p>
          </div>

          {isMobile ? (
            <div className="grid w-full grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => setFullscreenOpen(true)}>
                <Maximize2 /> Full Screen
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={src} download={downloadName}>
                  <Download /> Download
                </a>
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 /> Share
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-col gap-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => setFullscreenOpen(true)}>
                <Maximize2 /> View Full Screen
              </Button>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={src} download={downloadName}>
                  <Download /> Download PNG
                </a>
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={handleShare}>
                <Share2 /> Share
              </Button>
              <Button variant="outline" size="sm" className="w-full" onClick={copyMemberId}>
                <Copy /> Copy Member ID
              </Button>
            </div>
          )}

          {canManage && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                  <RefreshCw /> Refresh QR Code
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Refresh this QR code?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The current QR code will stop working immediately — anywhere it&apos;s printed or saved will
                    need to be replaced. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction disabled={isPending} onClick={handleRegenerate}>
                    Refresh
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      <QRFullscreenView
        open={fullscreenOpen}
        onOpenChange={setFullscreenOpen}
        token={token}
        fullName={fullName}
        memberNumber={memberNumber}
      />
    </>
  );
}
