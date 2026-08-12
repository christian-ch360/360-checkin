"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ScanLine, QrCode, FolderKanban, Handshake, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type QuickAction = { title: string; href: string; icon: LucideIcon };

const QUICK_ACTIONS: QuickAction[] = [
  { title: "Scanner", href: "/scan", icon: ScanLine },
  { title: "My QR Code", href: "/my-qr", icon: QrCode },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Community", href: "/community", icon: Handshake },
];

export function QuickActionsSheet({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Quick actions</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-4 gap-2 p-4 pt-0">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href} onClick={() => setOpen(false)}>
                <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center shadow-sm transition-colors hover:bg-muted/50">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4.5" />
                  </div>
                  <p className="text-[11px] font-medium leading-tight">{action.title}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
