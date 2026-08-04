"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, Palette, LayoutTemplate, Megaphone, BarChart3 } from "lucide-react";
import { KioskDashboardTab } from "@/features/kiosk/components/admin/kiosk-dashboard-tab";
import { KioskThemesTab } from "@/features/kiosk/components/admin/kiosk-themes-tab";
import { KioskHomepageBuilderTab } from "@/features/kiosk/components/admin/kiosk-homepage-builder-tab";
import { KioskAnnouncementsTab } from "@/features/kiosk/components/admin/kiosk-announcements-tab";
import { KioskAnalyticsTab } from "@/features/kiosk/components/admin/kiosk-analytics-tab";
import type { getKioskManagerDashboard } from "@/features/kiosk/services/kiosk-dashboard.service";
import type { KioskThemeAnalytics, KioskDailyInteractionPoint } from "@/features/kiosk/services/kiosk-analytics.service";

type DashboardData = Awaited<ReturnType<typeof getKioskManagerDashboard>>;

export function KioskManagerShell({
  dashboard,
  sections,
  announcements,
  analytics,
  timeSeries,
}: {
  dashboard: DashboardData;
  sections: Awaited<ReturnType<typeof import("@/features/kiosk/services/kiosk-sections.service").getHomepageSections>>;
  announcements: Awaited<ReturnType<typeof import("@/features/kiosk/services/kiosk-announcements.service").listAnnouncements>>;
  analytics: Record<string, KioskThemeAnalytics>;
  timeSeries: KioskDailyInteractionPoint[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const validTabs = ["dashboard", "themes", "homepage", "announcements", "analytics"];
  const [tab, setTab] = useState(initialTab && validTabs.includes(initialTab) ? initialTab : "dashboard");

  function handleTabChange(next: string) {
    setTab(next);
    router.replace(`/admin/kiosk-manager?tab=${next}`, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="dashboard" className="gap-1.5">
          <LayoutDashboard className="size-4" /> Dashboard
        </TabsTrigger>
        <TabsTrigger value="themes" className="gap-1.5">
          <Palette className="size-4" /> Themes
        </TabsTrigger>
        <TabsTrigger value="homepage" className="gap-1.5">
          <LayoutTemplate className="size-4" /> Homepage
        </TabsTrigger>
        <TabsTrigger value="announcements" className="gap-1.5">
          <Megaphone className="size-4" /> Announcements
        </TabsTrigger>
        <TabsTrigger value="analytics" className="gap-1.5">
          <BarChart3 className="size-4" /> Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dashboard" className="mt-6">
        <KioskDashboardTab dashboard={dashboard} />
      </TabsContent>
      <TabsContent value="themes" className="mt-6">
        <KioskThemesTab themes={dashboard.themes} />
      </TabsContent>
      <TabsContent value="homepage" className="mt-6">
        <KioskHomepageBuilderTab sections={sections} />
      </TabsContent>
      <TabsContent value="announcements" className="mt-6">
        <KioskAnnouncementsTab announcements={announcements} />
      </TabsContent>
      <TabsContent value="analytics" className="mt-6">
        <KioskAnalyticsTab themes={dashboard.themes} analytics={analytics} timeSeries={timeSeries} />
      </TabsContent>
    </Tabs>
  );
}
