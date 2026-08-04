"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ACCENTS } from "@/config/nav-colors";
import type { NavItem } from "@/config/nav";

export function NavLink({
  item,
  collapsed,
  onNavigate,
  indicatorLayoutId,
}: {
  item: NavItem;
  collapsed?: boolean;
  onNavigate?: () => void;
  /** Shared-element id for the active accent bar, so it glides between items instead of remounting. */
  indicatorLayoutId?: string;
}) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const accent = NAV_ACCENTS[item.accent];

  return (
    <div className="relative">
      {active && (
        <motion.span
          layoutId={indicatorLayoutId}
          aria-hidden
          className={cn("absolute -left-2 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full", accent.bar)}
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Link
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200 ease-out",
          active
            ? cn(accent.activeBg, accent.activeText, accent.glow)
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:translate-x-0.5"
        )}
      >
        <Icon
          className={cn("size-4 shrink-0 transition-colors duration-200", active ? accent.activeIcon : accent.icon)}
        />
        {!collapsed && <span className="truncate">{item.title}</span>}
      </Link>
    </div>
  );
}
