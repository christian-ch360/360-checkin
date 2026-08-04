"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, DoorOpen, MessageSquare, Settings, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BottomNavFab } from "@/components/layout/bottom-nav-fab";
import { QuickActionsSheet } from "@/components/layout/quick-actions-sheet";

type BottomNavItem = { title: string; href: string; icon: LucideIcon };

// One universal 4-item set for every role — full role-appropriate navigation
// (admin or creator) lives in the hamburger/MobileNav sheet; the bottom bar
// is just quick-tap access, and 4 icons is the natural ceiling for it
// regardless of role.
const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { title: "Home", href: "/dashboard", icon: LayoutDashboard },
  { title: "Spaces", href: "/spaces", icon: DoorOpen },
  { title: "Messages", href: "/messages", icon: MessageSquare },
  { title: "Settings", href: "/settings", icon: Settings },
];

function tapHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(10);
    } catch (err) {
      console.warn("Nav vibrate:", err);
    }
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const midpoint = Math.ceil(BOTTOM_NAV_ITEMS.length / 2);
  const leftItems = BOTTOM_NAV_ITEMS.slice(0, midpoint);
  const rightItems = BOTTOM_NAV_ITEMS.slice(midpoint);

  function renderItem(item: BottomNavItem) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={tapHaptic}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground"
        )}
      >
        {active && (
          <motion.div
            layoutId="bottom-nav-active"
            className="absolute top-1 size-8 rounded-full bg-primary/10"
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
          />
        )}
        <Icon className="relative size-5" />
        <span className="relative">{item.title}</span>
      </Link>
    );
  }

  return (
    <nav
      className="pb-safe fixed inset-x-0 bottom-0 z-40 flex items-stretch rounded-t-2xl border-t bg-background/95 shadow-[0_-1px_8px_rgba(0,0,0,0.06)] backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
      aria-label="Primary"
    >
      {leftItems.map(renderItem)}

      <div className="relative flex w-16 shrink-0 items-center justify-center">
        <div className="absolute -top-6">
          <QuickActionsSheet trigger={<BottomNavFab />} />
        </div>
      </div>

      {rightItems.map(renderItem)}
    </nav>
  );
}
