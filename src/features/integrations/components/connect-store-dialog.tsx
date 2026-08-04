"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { StoreProvider } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { connectStore } from "@/features/integrations/services/store-actions";

export function ConnectStoreDialog({
  provider,
  label,
  trigger,
}: {
  provider: StoreProvider;
  label: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!domain.trim()) return;
    startTransition(async () => {
      const result = await connectStore(provider, domain.trim());
      // connectStore redirects on success (throws NEXT_REDIRECT), so a
      // resolved { success: false } result here always means a real error.
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>Connect your {label} store</DialogTitle>
          <DialogDescription>
            Enter your store&apos;s domain — we&apos;ll take you to {label}&apos;s official sign-in page to authorize the connection.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="shop-domain">Store domain</Label>
          <Input
            id="shop-domain"
            placeholder="yourstore.myshopify.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !domain.trim()}>
            {isPending ? "Connecting…" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
