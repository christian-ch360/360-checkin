"use client";

import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function QRCodeDisplay({
  token,
  label,
  size = 200,
}: {
  token: string;
  label: string;
  size?: number;
}) {
  const src = `/api/qr/${token}`;

  return (
    <Card className="border shadow-sm">
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <div
          className="overflow-hidden rounded-lg border bg-white p-2"
          style={{ width: size + 16, height: size + 16 }}
        >
          <Image src={src} alt={`QR code for ${label}`} width={size} height={size} unoptimized />
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <Button variant="outline" size="sm" asChild className="w-full">
          <a href={src} download={`${label.replace(/\s+/g, "-").toLowerCase()}-qr.png`}>
            <Download />
            Download
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
