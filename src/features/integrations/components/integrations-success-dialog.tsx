"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CheckCircle2, PartyPopper, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PLATFORM_LABELS: Record<string, string> = {
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  SHOPIFY: "Online Store",
};

const SUCCESS_CHECKLISTS: Record<string, string[]> = {
  SHOPIFY: ["Store Connected", "Revenue Sync Started", "Brand Matching Enabled"],
  DEFAULT: ["Profile Imported", "Analytics Ready", "Brand Matching Enabled"],
};

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "isn't configured yet — ask an admin to add API credentials.",
  missing_code: "The connection was interrupted before it finished. Please try again.",
  invalid_state: "This connection link expired or was tampered with. Please try again.",
  invalid_hmac: "We couldn't verify this request came from the platform. Please try again.",
  unknown_platform: "That platform isn't supported.",
  connect_failed: "We couldn't complete the connection. Please try again.",
};

const RECONNECTABLE_PLATFORMS = new Set(["TIKTOK", "INSTAGRAM", "YOUTUBE"]);

export function IntegrationsSuccessDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const connected = searchParams.get("connected");
  const error = searchParams.get("error");
  const platform = searchParams.get("platform");

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (connected || error) setOpen(true);
  }, [connected, error]);

  const platformLabel = useMemo(() => {
    const key = (connected ?? platform ?? "").toUpperCase();
    return PLATFORM_LABELS[key] ?? key;
  }, [connected, platform]);

  function close() {
    setOpen(false);
    router.replace(pathname);
  }

  if (!connected && !error) return null;

  const isInstagramPersonal = error === "instagram_personal_account";

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent mobileFullscreen className="sm:max-w-sm">
        {connected ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <PartyPopper className="size-5 text-success" />
                {platformLabel} Connected
              </DialogTitle>
              <DialogDescription>Your account is linked and syncing.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-2.5">
              {(SUCCESS_CHECKLISTS[connected.toUpperCase()] ?? SUCCESS_CHECKLISTS.DEFAULT).map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button className="w-full" onClick={close}>
                Continue
              </Button>
            </DialogFooter>
          </>
        ) : isInstagramPersonal ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="size-5 text-warning" />
                Creator or Business account needed
              </DialogTitle>
              <DialogDescription>
                CreatorHub360 needs a Creator or Business Instagram account to import your stats — personal accounts don&apos;t
                expose analytics through Instagram&apos;s API.
              </DialogDescription>
            </DialogHeader>
            <a
              href="https://help.instagram.com/502981923235522"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-foreground underline underline-offset-2"
            >
              How to switch your account type <ExternalLink className="size-3.5" />
            </a>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Close
              </Button>
              <Button asChild>
                <a href="/api/integrations/instagram/connect">Try again</a>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <AlertCircle className="size-5 text-destructive" />
                Couldn&apos;t connect {platformLabel}
              </DialogTitle>
              <DialogDescription>
                {error === "not_configured"
                  ? `${platformLabel} ${ERROR_MESSAGES.not_configured}`
                  : (ERROR_MESSAGES[error ?? ""] ?? "Something went wrong. Please try again.")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={close}>
                Close
              </Button>
              {platform && RECONNECTABLE_PLATFORMS.has(platform.toUpperCase()) && (
                <Button asChild>
                  <a href={`/api/integrations/${platform.toLowerCase()}/connect`}>Try again</a>
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
