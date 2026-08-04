"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSettingsDirtyStore } from "@/stores/settings-dirty-store";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type SettingsNavTab = { id: string; label: string; href: string };

/**
 * Routing-based Settings nav — each tab is a real URL (/settings/[tab]),
 * so deep links, refresh, and browser back/forward all work natively via
 * Next's router. Replaces the old anchor-scroll IntersectionObserver
 * version that never touched the URL. Intercepts tab clicks (and tab
 * close/refresh) with a confirm step whenever the active tab has unsaved
 * form state — see useSettingsFormDirty, which every form-bearing section
 * reports into.
 */
export function SettingsShell({
  tabs,
  activeTab,
  children,
}: {
  tabs: SettingsNavTab[];
  activeTab: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const isDirty = useSettingsDirtyStore((s) => s.isDirty);
  const setDirty = useSettingsDirtyStore((s) => s.setDirty);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function handleTabClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (href === `/settings/${activeTab}`) return;
    if (!isDirty) return;
    e.preventDefault();
    setPendingHref(href);
  }

  function confirmLeave() {
    setDirty(false);
    if (pendingHref) router.push(pendingHref);
    setPendingHref(null);
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:items-start lg:gap-10">
        {/* Mobile: sticky horizontal scrollable tab bar. Offset below the
            sticky Topbar (h-14 + its own safe-area padding) so the two
            don't overlap. */}
        <nav className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 flex gap-1.5 overflow-x-auto border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              onClick={(e) => handleTabClick(e, t.href)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                activeTab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {/* Desktop: sticky sidebar */}
        <nav className="sticky top-6 hidden flex-col gap-0.5 lg:flex">
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={t.href}
              onClick={(e) => handleTabClick(e, t.href)}
              className={cn(
                "rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                activeTab === t.id
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="min-w-0 space-y-6">{children}</div>
      </div>

      <AlertDialog open={pendingHref !== null} onOpenChange={(open) => !open && setPendingHref(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on this tab. Leaving now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingHref(null)}>
              Stay on this tab
            </Button>
            <Button variant="destructive" onClick={confirmLeave}>
              Leave without saving
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
