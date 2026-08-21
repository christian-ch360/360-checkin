"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import type { SystemRole, MemberRole } from "@prisma/client";
import { NAV_SECTIONS } from "@/config/nav";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/layout/nav-link";
import { LogoMark } from "@/features/auth/components/logo-mark";

export function MobileNav({ role, memberRole }: { role: SystemRole; memberRole: MemberRole }) {
  const [open, setOpen] = useState(false);
  const navSections = NAV_SECTIONS.filter(
    (section) => !section.requiredPermission || hasPermission(role, section.requiredPermission)
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="flex items-center gap-2 text-sm">
            <LogoMark size="xs" />
            CreatorHub360
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-6 overflow-y-auto p-3">
          {navSections.map((section) => {
            const items = section.items.filter(
              (item) =>
                (!item.permission || hasPermission(role, item.permission)) &&
                (!item.memberRoles || item.memberRoles.includes(memberRole))
            );
            if (items.length === 0) return null;
            return (
              <div key={section.title}>
                {section.title && (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      item={item}
                      onNavigate={() => setOpen(false)}
                      indicatorLayoutId="mobile-nav-active-indicator"
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
