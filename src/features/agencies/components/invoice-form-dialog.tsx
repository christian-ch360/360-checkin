"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createInvoice } from "@/features/agencies/services/invoice-actions";

type Option = { id: string; name: string };

export function InvoiceFormDialog({ brandId, campaigns }: { brandId: string; campaigns: Option[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [campaignId, setCampaignId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const amountNumber = Number(amount);
    if (!dueDate || !amount.trim() || Number.isNaN(amountNumber) || amountNumber <= 0) return;

    startTransition(async () => {
      const result = await createInvoice({
        brandId,
        campaignId: campaignId || undefined,
        amount: amountNumber,
        dueDate,
        notes: notes || undefined,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invoice created");
      setCampaignId("");
      setAmount("");
      setDueDate("");
      setNotes("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4" /> New invoice
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>New invoice</DialogTitle>
          <DialogDescription>Creates a draft invoice for this brand.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
            <Label>Amount</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Due date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!dueDate || !amount.trim() || isPending} className="w-full">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Create invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
