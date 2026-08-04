"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QRFullscreenView({
  open,
  onOpenChange,
  token,
  fullName,
  memberNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  fullName: string;
  memberNumber: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    // Intentionally hardcoded light background regardless of app theme —
    // this view exists to be scanned by a camera at the door, and a
    // reliable white background beats matching dark mode here.
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-6 text-black">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-black hover:bg-black/5 hover:text-black"
        onClick={() => onOpenChange(false)}
        aria-label="Close"
      >
        <X className="size-6" />
      </Button>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white p-4 shadow-lg">
        <Image
          src={`/api/qr/${token}`}
          alt={`QR code for ${fullName}`}
          width={320}
          height={320}
          unoptimized
          priority
          className="size-[min(70vw,320px)]"
        />
      </div>

      <div className="text-center">
        <p className="text-lg font-semibold">{fullName}</p>
        <p className="text-sm text-black/60">{memberNumber}</p>
      </div>

      <p className="text-xs text-black/40">Hold steady for the scanner</p>
    </div>
  );
}
