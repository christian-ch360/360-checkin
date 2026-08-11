"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, Send, Trash2, UploadCloud } from "lucide-react";
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
import {
  updateContractStatus,
  deleteContract,
  sendContractForSignatureAction,
  refreshContractStatusAction,
  uploadContractVersion,
} from "@/features/agencies/services/contract-actions";
import type { ContractStatus } from "@prisma/client";

const STATUS_OPTIONS: ContractStatus[] = ["DRAFT", "SENT", "SIGNED", "DECLINED", "EXPIRED", "CANCELLED"];

function SendForSignatureDialog({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Send className="size-4" /> Send for signature
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>Send for e-signature</DialogTitle>
          <DialogDescription>Sends the current file via DocuSign. Requires DocuSign to be configured for this organization.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Recipient name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" />
          </div>
          <div className="space-y-1.5">
            <Label>Recipient email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jordan@brand.com" />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!name.trim() || !email.trim() || isPending}
            className="w-full"
            onClick={() =>
              startTransition(async () => {
                const result = await sendContractForSignatureAction(contractId, email.trim(), name.trim());
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Sent for signature");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ContractDetailActions({
  contractId,
  status,
  canManage,
  canDelete,
}: {
  contractId: string;
  status: ContractStatus;
  canManage: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [versionFile, setVersionFile] = useState<File | null>(null);

  function setStatus(next: string) {
    startTransition(async () => {
      const result = await updateContractStatus(contractId, next as ContractStatus);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function uploadVersion() {
    if (!versionFile) return;
    const formData = new FormData();
    formData.set("file", versionFile);
    startTransition(async () => {
      const result = await uploadContractVersion(contractId, formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setVersionFile(null);
      router.refresh();
    });
  }

  if (!canManage) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="h-9 w-36 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SendForSignatureDialog contractId={contractId} />

      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await refreshContractStatusAction(contractId);
            if (!result.success) {
              toast.error(result.error);
              return;
            }
            router.refresh();
          })
        }
      >
        <RefreshCw className="size-4" /> Check status
      </Button>

      <div className="flex items-center gap-1.5">
        <Input
          type="file"
          accept="application/pdf"
          className="h-9 w-40 text-xs"
          onChange={(e) => setVersionFile(e.target.files?.[0] ?? null)}
        />
        <Button size="sm" variant="outline" disabled={!versionFile || isPending} onClick={uploadVersion}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
        </Button>
      </div>

      {canDelete && (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Delete this contract? This can't be undone.")) return;
            startTransition(async () => {
              const result = await deleteContract(contractId);
              if (!result.success) {
                toast.error(result.error);
                return;
              }
              router.push("/agency/contracts");
            });
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
