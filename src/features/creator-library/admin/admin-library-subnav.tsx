"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { label: "Browse Creators", href: "/admin/creator-library", match: (p: string) => p === "/admin/creator-library" || /^\/admin\/creator-library\/[0-9a-f-]{36}$/.test(p) },
  { label: "Import Creators", href: "/admin/creator-library/import", match: (p: string) => p.startsWith("/admin/creator-library/import") && !p.startsWith("/admin/creator-library/imports") },
  { label: "Import History", href: "/admin/creator-library/imports", match: (p: string) => p.startsWith("/admin/creator-library/imports") },
  { label: "Categories", href: "/admin/creator-library/categories", match: (p: string) => p.startsWith("/admin/creator-library/categories") },
  { label: "Locations", href: "/admin/creator-library/locations", match: (p: string) => p.startsWith("/admin/creator-library/locations") },
  { label: "Reach", href: "/admin/creator-library/reach", match: (p: string) => p.startsWith("/admin/creator-library/reach") },
];

export function AdminLibrarySubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-b border-border pb-2">
      {ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
