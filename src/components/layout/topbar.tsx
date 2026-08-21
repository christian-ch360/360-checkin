"use client";

import { Search } from "lucide-react";
import type { SystemRole, MemberRole } from "@prisma/client";
import { useUIStore } from "@/stores/ui-store";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { MessagesMenu } from "@/components/layout/messages-menu";
import { UserMenu } from "@/components/layout/user-menu";

export function Topbar({
  role,
  memberRole,
  memberId,
  fullName,
  email,
  photoUrl,
  memberNumber,
}: {
  role: SystemRole;
  memberRole: MemberRole;
  memberId: string;
  fullName: string;
  email: string;
  photoUrl?: string | null;
  memberNumber: string;
}) {
  const { setCommandPaletteOpen } = useUIStore();

  return (
    // Positioning (sticky/top/z-index) lives on the wrapper in (dashboard)/layout.tsx,
    // not here — it groups this header with any notification banners so the two stick
    // to the viewport top as one unit and the banner never scrolls out from under it.
    <header className="pt-safe flex min-h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
      <MobileNav role={role} memberRole={memberRole} />

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search anything...</span>
        <kbd className="hidden rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <MessagesMenu />
        <NotificationsMenu />
        <UserMenu
          memberId={memberId}
          fullName={fullName}
          email={email}
          photoUrl={photoUrl}
          memberNumber={memberNumber}
        />
      </div>
    </header>
  );
}
