"use client";

import Link from "next/link";
import { ScanLine, QrCode, FolderKanban, Handshake, type LucideIcon } from "lucide-react";

type QuickAction = { title: string; href: string; icon: LucideIcon };

const QUICK_ACTIONS: QuickAction[] = [
  { title: "Scanner", href: "/scan", icon: ScanLine },
  { title: "My QR Code", href: "/my-qr", icon: QrCode },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Community", href: "/community", icon: Handshake },
];

const TILE_CLASS =
  "card-interactive flex items-center gap-2.5 rounded-full border bg-card py-2 pl-2.5 pr-4 shadow-sm hover:bg-muted/50";

export function HomeQuickActions() {
  return (
    <div className="flex flex-wrap gap-2.5">
      {QUICK_ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <Link key={action.href} href={action.href} className={TILE_CLASS}>
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-3.5" />
            </div>
            <p className="whitespace-nowrap text-sm font-medium">{action.title}</p>
          </Link>
        );
      })}
    </div>
  );
}
