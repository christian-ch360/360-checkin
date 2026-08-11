"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createContract } from "@/features/agencies/services/contract-actions";

type Option = { id: string; name: string };

export function ContractFormDialog({ campaigns, brands }: { campaigns: Option[]; brands: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!title.trim() || !file) return;
    const formData = new FormData();
    formData.set("title", title.trim());
    if (campaignId) formData.set("campaignId", campaignId);
    if (brandId) formData.set("brandId", brandId);
    if (expiresAt) formData.set("expiresAt", expiresAt);
    formData.set("file", file);

    startTransition(async () => {
      const result = await createContract(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Contract created");
      setTitle("");
      setCampaignId("");
      setBrandId("");
      setExpiresAt("");
      setFile(null);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus /> New contract
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>New contract</DialogTitle>
          <DialogDescription>Upload a PDF and link it to a campaign or brand.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Master Services Agreement" />
          </div>
          <div className="space-y-1.5">
            <Label>Campaign</Label>
            <Select value={campaignId || undefined} onValueChange={setCampaignId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Brand</Label>
            <Select value={brandId || undefined} onValueChange={setBrandId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Expires</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>PDF</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!title.trim() || !file || isPending} className="w-full">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Create contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
