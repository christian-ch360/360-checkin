import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import {
  listEventsForAdminTab,
  getAdminEventTabCounts,
  ADMIN_EVENT_TABS,
  type AdminEventTab,
} from "@/features/events/services/events.service";
import { getOrgEventAnalytics } from "@/features/events/services/event-analytics.service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EVENT_CATEGORY_META } from "@/features/events/config/event-categories";
import { EventReviewActions } from "@/features/events/components/event-review-actions";
import { AdminEventActionsMenu } from "@/features/events/components/admin-event-actions-menu";
import { CalendarClock, Users, MapPin, Star, PartyPopper, Eye, Users as UsersIcon, CheckCircle2, Repeat } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin Event Manager" };

const TAB_LABEL: Record<AdminEventTab, string> = {
  pending: "Pending",
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
  drafts: "Drafts",
};

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "events.manage")) redirect("/dashboard");

  const { tab: tabParam } = await searchParams;
  const tab: AdminEventTab = (ADMIN_EVENT_TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as AdminEventTab)
    : "pending";

  const [events, counts, analytics] = await Promise.all([
    listEventsForAdminTab(actor.organizationId, tab),
    getAdminEventTabCounts(actor.organizationId),
    getOrgEventAnalytics(actor.organizationId),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Event Manager" description="Review proposals and manage published events." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total Events" value={String(analytics.totalEvents)} icon={PartyPopper} />
        <StatCard label="Total RSVPs" value={String(analytics.totalRsvps)} icon={UsersIcon} />
        <StatCard label="Total Check-ins" value={String(analytics.totalCheckIns)} icon={CheckCircle2} />
        <StatCard label="Avg Attendance" value={String(analytics.averageAttendance)} icon={Eye} />
        <StatCard label="Repeat Attendees" value={String(analytics.repeatAttendees)} icon={Repeat} />
      </div>

      <div className="flex flex-wrap gap-1.5 border-b pb-px">
        {ADMIN_EVENT_TABS.map((t) => (
          <Link
            key={t}
            href={`/admin/events?tab=${t}`}
            className={`rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {TAB_LABEL[t]}
            {counts[t] > 0 && <span className="ml-1.5 text-xs text-muted-foreground">({counts[t]})</span>}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState icon={PartyPopper} title="Nothing here" description={`No events in "${TAB_LABEL[tab]}" right now.`} />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const categoryMeta = EVENT_CATEGORY_META[event.category];
            const CategoryIcon = categoryMeta.icon;
            const goingCount = event.rsvps.filter((r) => r.status === "GOING").length;

            return (
              <Card key={event.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={event.status === "PUBLISHED" ? `/events/${event.id}` : `/events/proposals/${event.id}`}
                        className="font-medium hover:underline"
                      >
                        {event.title}
                      </Link>
                      <Badge variant="outline" className={`gap-1 text-[11px] ${categoryMeta.badgeClass}`}>
                        <CategoryIcon className="size-3" /> {categoryMeta.label}
                      </Badge>
                      {event.isFeatured && (
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                          <Star className="size-3 fill-current" /> Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="size-3.5" /> {format(event.startTime, "MMM d, yyyy · h:mm a")}
                      </span>
                      {event.space && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" /> {event.space.name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="size-3.5" /> {goingCount}
                        {event.capacity ? ` / ${event.capacity}` : ""}
                      </span>
                      {event.createdBy && <span>Host: {event.createdBy.fullName}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {tab === "pending" ? (
                      <>
                        <Link
                          href={`/events/proposals/${event.id}`}
                          className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
                        >
                          Preview
                        </Link>
                        <EventReviewActions eventId={event.id} />
                      </>
                    ) : (
                      <AdminEventActionsMenu eventId={event.id} status={event.status} isFeatured={event.isFeatured} />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
