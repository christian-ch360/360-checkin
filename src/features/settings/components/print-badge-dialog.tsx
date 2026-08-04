"use client";

import Image from "next/image";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function PrintBadgeDialog({
  open,
  onOpenChange,
  fullName,
  memberNumber,
  role,
  organizationName,
  qrToken,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string;
  memberNumber: string;
  role: string;
  organizationName: string;
  qrToken: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print badge</DialogTitle>
          <DialogDescription>
            Prints just the badge below — your browser&apos;s print dialog will open next.
          </DialogDescription>
        </DialogHeader>

        <div className="print-badge flex justify-center">
          <div className="w-72 rounded-2xl border bg-white p-6 text-center text-black shadow-sm print:shadow-none">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{organizationName}</p>
            <p className="mt-2 text-lg font-semibold">{fullName}</p>
            <p className="text-xs text-neutral-500 capitalize">{role.toLowerCase().replaceAll("_", " ")}</p>
            <div className="mx-auto mt-4 w-fit rounded-lg border p-2">
              <Image src={`/api/qr/${qrToken}`} alt={`QR code for ${fullName}`} width={160} height={160} unoptimized />
            </div>
            <p className="mt-3 text-xs text-neutral-500">{memberNumber}</p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
