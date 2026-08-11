"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { inviteBrandContactAction } from "@/features/agencies/services/brand-invitation-actions";

export function BrandInviteDialog({ brandId }: { brandId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!fullName.trim() || !email.trim()) return;
    startTransition(async () => {
      const result = await inviteBrandContactAction(brandId, fullName.trim(), email.trim());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation sent");
      setFullName("");
      setEmail("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="size-4" /> Invite brand contact
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>Invite brand contact</DialogTitle>
          <DialogDescription>They&apos;ll get a portal login to view campaigns, contracts, and invoices for this brand.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jordan Lee" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@brand.com" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!fullName.trim() || !email.trim() || isPending} className="w-full">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
