"use client";

import { motion } from "framer-motion";
import { QRScanner } from "@/features/qr/components/qr-scanner";

export function ScanScreen({ onScan, onCancel }: { onScan: (token: string) => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex w-full max-w-lg flex-col items-center gap-6 text-center"
    >
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-black">Scan Your CreatorHub360 QR Code</h2>
        <p className="mt-2 text-black/50">Align your QR code inside the frame.</p>
      </div>

      <QRScanner onScan={onScan} successLabel="Checking in…" />

      <button
        type="button"
        onClick={onCancel}
        className="min-h-14 w-full max-w-xs rounded-2xl border border-black/10 text-lg font-medium text-black outline-none transition-colors hover:bg-black/[0.03] active:bg-black/[0.06] focus-visible:ring-4 focus-visible:ring-black/15 focus-visible:ring-offset-4 focus-visible:ring-offset-white"
      >
        Cancel
      </button>
    </motion.div>
  );
}
