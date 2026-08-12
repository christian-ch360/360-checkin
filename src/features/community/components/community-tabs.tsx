"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/community", label: "Feed" },
  { href: "/community/collabs", label: "Collabs" },
  { href: "/community/directory", label: "Directory" },
] as const;

/** The top-level Feed/Collabs/Directory tab bar shared by every page under
 * `/community` — lives in the segment layout so it persists across
 * navigation instead of remounting per page. */
export function CommunityTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b">
      {TABS.map((tab) => {
        const isActive = tab.href === "/community" ? pathname === "/community" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
