"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type DashboardTab = { title: string; href: string };

// Real navigation between nested routes, not Radix Tabs' in-page state —
// styled to match TabsList/TabsTrigger's visual language (rounded pill
// container, active item gets a background) so it reads as a tab bar even
// though each tab is its own page with its own server-fetched data. This is
// required for the Analytics tab: its data must never be fetched or sent to
// the client at all for a role that can't see it, which a client-side Tabs
// component pre-rendering all panels couldn't guarantee.
export function DashboardTabNav({ tabs }: { tabs: DashboardTab[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="inline-flex w-fit items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground"
      aria-label="Dashboard sections"
    >
      {tabs.map((tab) => {
        const active = tab.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
              active ? "bg-background text-info shadow-sm ring-1 ring-info/15" : "hover:text-foreground"
            )}
          >
            {tab.title}
          </Link>
        );
      })}
    </nav>
  );
}
