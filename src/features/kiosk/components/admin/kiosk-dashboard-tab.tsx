import Link from "next/link";
import { format } from "date-fns";
import { Sparkles, Clock, CalendarDays, Megaphone, Handshake, User, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import type { getKioskManagerDashboard } from "@/features/kiosk/services/kiosk-dashboard.service";

const STATUS_TONE: Record<string, string> = {
  LIVE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  SCHEDULED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  DRAFT: "bg-muted text-muted-foreground",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export function KioskDashboardTab({ dashboard }: { dashboard: Awaited<ReturnType<typeof getKioskManagerDashboard>> }) {
  const { activeTheme, upcomingScheduled, todaysEvent, activeAnnouncement, themes } = dashboard;
  const activeThemeRow = activeTheme ? themes.find((t) => t.themeKey === activeTheme.themeKey) : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Current Active Theme</CardTitle>
            </div>
            {activeThemeRow && (
              <Badge variant="outline" className={STATUS_TONE[activeThemeRow.displayStatus]}>
                {activeThemeRow.displayStatus}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {activeTheme ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold">{activeTheme.name}</p>
                <p className="text-sm text-muted-foreground">{activeTheme.headline}</p>
                {activeThemeRow && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="size-3" /> Last edited by {activeThemeRow.createdBy?.fullName ?? "—"}
                    </span>
                    {activeThemeRow.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> Published {format(activeThemeRow.publishedAt, "MMM d, h:mm a")}
                      </span>
                    )}
                  </div>
                )}
                <Link
                  href={`/admin/kiosk-manager/themes/${activeTheme.themeKey}`}
                  className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"
                >
                  <Pencil className="size-3" /> Edit theme
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active theme resolved.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <CalendarDays className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Today&apos;s Event</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysEvent ? (
              <div className="space-y-1">
                <p className="text-lg font-semibold">{todaysEvent.title}</p>
                <p className="text-sm text-muted-foreground">
                  {format(todaysEvent.startTime, "h:mm a")} – {format(todaysEvent.endTime, "h:mm a")}
                  {todaysEvent.location && ` · ${todaysEvent.location}`}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No event scheduled today.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Handshake className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Active Sponsor</CardTitle>
          </CardHeader>
          <CardContent>
            {activeTheme && Array.isArray(activeTheme.sponsors) && activeTheme.sponsors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(activeTheme.sponsors as { name: string }[]).map((s) => (
                  <Badge key={s.name} variant="outline">
                    {s.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sponsors on the active theme.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2">
            <Megaphone className="size-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Active Announcement</CardTitle>
          </CardHeader>
          <CardContent>
            {activeAnnouncement ? (
              <div>
                <p className="text-sm font-medium">{activeAnnouncement.title}</p>
                {activeAnnouncement.description && (
                  <p className="text-xs text-muted-foreground">{activeAnnouncement.description}</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No published announcements right now.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-tight">Upcoming Scheduled Themes</h2>
        {upcomingScheduled.length === 0 ? (
          <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Publish a theme with a future start date to see it here." />
        ) : (
          <div className="space-y-2">
            {upcomingScheduled.map((theme) => (
              <Link
                key={theme.themeKey}
                href={`/admin/kiosk-manager/themes/${theme.themeKey}`}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(theme.startDate, "MMM d")} – {format(theme.endDate, "MMM d, yyyy")}
                    {theme.startTime && ` · ${theme.startTime}`}
                  </p>
                </div>
                <Badge variant="outline" className={STATUS_TONE.SCHEDULED}>
                  Scheduled
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
