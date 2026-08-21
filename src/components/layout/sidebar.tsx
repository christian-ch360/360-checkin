"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import type { SystemRole, MemberRole } from "@prisma/client";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { NAV_SECTIONS } from "@/config/nav";
import { hasPermission } from "@/lib/permissions";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/layout/nav-link";
import { LogoMark } from "@/features/auth/components/logo-mark";

export function Sidebar({ role, memberRole }: { role: SystemRole; memberRole: MemberRole }) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navSections = NAV_SECTIONS.filter(
    (section) => !section.requiredPermission || hasPermission(role, section.requiredPermission)
  );

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px) and (max-width: 1024px)");
    if (mql.matches) {
      useUIStore.setState({ sidebarCollapsed: true });
    }
    // One-time default for landing on a tablet-width viewport -- intentionally not a live
    // listener, so the manual collapse toggle remains the sole control after mount.
  }, []);

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 248 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className="hidden shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex"
    >
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <LogoMark size="xs" />
        {!sidebarCollapsed && (
          <span className="truncate text-sm font-semibold tracking-tight">
            CreatorHub360
          </span>
        )}
      </div>

      <nav className="flex-1 space-y-8 overflow-y-auto px-2 py-5">
        {navSections.map((section) => {
          const items = section.items.filter(
            (item) =>
              (!item.permission || hasPermission(role, item.permission)) &&
              (!item.memberRoles || item.memberRoles.includes(memberRole))
          );
          if (items.length === 0) return null;

          return (
            <div key={section.title}>
              {!sidebarCollapsed && section.title && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    collapsed={sidebarCollapsed}
                    indicatorLayoutId="sidebar-active-indicator"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="size-4" />
          ) : (
            <>
              <ChevronsLeft className="size-4" />
              Collapse
            </>
          )}
        </Button>
      </div>
    </motion.aside>
  );
}
