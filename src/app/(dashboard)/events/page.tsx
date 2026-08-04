import Link from "next/link";
import { format } from "date-fns";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listUpcomingEvents, listPastEvents, listMyEventProposals } from "@/features/events/services/events.service";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EventCard } from "@/features/events/components/event-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PartyPopper, Plus, FileClock } from "lucide-react";
import { isDemoModeActive, demoListUpcomingEvents } from "@/features/demo-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Events" };

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending review",
  PUBLISHED: "Published",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
};

export default async function EventsPage() {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "events.manage");

  const [upcoming, past, myProposals] = await Promise.all([
    isDemoModeActive(actor) ? Promise.resolve(demoListUpcomingEvents()) : listUpcomingEvents(actor.organizationId),
    listPastEvents(actor.organizationId),
    listMyEventProposals(actor.organizationId, actor.id),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Events"
        description="Upcoming CreatorHub360 events and RSVPs."
        actions={
          <Button asChild size="sm">
            <Link href="/events/propose">
              <Plus /> Propose event
            </Link>
          </Button>
        }
      />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="proposals">
            My Proposals{myProposals.length > 0 && ` (${myProposals.length})`}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="manage" asChild>
              <Link href="/admin/events">Manage</Link>
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="upcoming">
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border py-16 text-center text-sm text-muted-foreground">
              <PartyPopper className="size-8 opacity-40" />
              No upcoming events yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="past">
          {past.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No past events.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="proposals">
          {myProposals.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border py-16 text-center text-sm text-muted-foreground">
              <FileClock className="size-8 opacity-40" />
              You haven&apos;t proposed any events yet.
            </div>
          ) : (
            <div className="space-y-2">
              {myProposals.map((p) => (
                <Link key={p.id} href={p.status === "PUBLISHED" ? `/events/${p.id}` : `/events/proposals/${p.id}`}>
                  <Card className="transition-colors hover:bg-muted/40">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(p.startTime, "MMM d, yyyy · h:mm a")}
                          {p.space && ` · ${p.space.name}`}
                        </p>
                      </div>
                      <Badge variant="secondary">{PROPOSAL_STATUS_LABEL[p.status] ?? p.status}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
