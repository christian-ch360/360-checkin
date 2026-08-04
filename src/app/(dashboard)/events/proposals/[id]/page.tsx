import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { Clock, XCircle, CalendarClock, MapPin, Users, UserCircle2 } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EventProposalForm } from "@/features/events/components/event-proposal-form";
import { EventReviewActions } from "@/features/events/components/event-review-actions";
import { EVENT_CATEGORY_META } from "@/features/events/config/event-categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Event Proposal" };

export default async function EventProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireCurrentMember();

  const event = await prisma.event.findFirst({ where: { id, organizationId: actor.organizationId } });
  if (!event) notFound();

  const isManager = hasPermission(actor.systemRole, "events.manage");
  if (event.createdById !== actor.id && !isManager) notFound();

  if (event.status === "PUBLISHED") redirect(`/events/${event.id}`);

  if (event.status === "PENDING_APPROVAL") {
    const space = event.spaceId
      ? await prisma.space.findUnique({ where: { id: event.spaceId }, select: { name: true } })
      : null;
    const categoryMeta = EVENT_CATEGORY_META[event.category];
    const CategoryIcon = categoryMeta.icon;

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader title={event.title} description={isManager ? "Review this event proposal." : "Submitted for review."} />

        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <Clock className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="font-medium">Pending admin review</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Submitted {event.submittedAt ? format(event.submittedAt, "MMM d, yyyy 'at' h:mm a") : ""}. You&apos;ll be
                notified once it&apos;s reviewed.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposal details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Badge variant="outline" className={`w-fit gap-1.5 ${categoryMeta.badgeClass}`}>
              <CategoryIcon className="size-3" /> {categoryMeta.label}
            </Badge>
            {event.description && <p className="whitespace-pre-wrap text-muted-foreground">{event.description}</p>}
            <p className="flex items-center gap-2 text-muted-foreground">
              <CalendarClock className="size-4 shrink-0" />
              {format(event.startTime, "EEE, MMM d · h:mm a")} – {format(event.endTime, "h:mm a")}
            </p>
            {(event.location || space) && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-4 shrink-0" /> {event.location ?? space?.name}
              </p>
            )}
            {event.capacity && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Users className="size-4 shrink-0" /> Capacity {event.capacity}
              </p>
            )}
            {event.hostName && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <UserCircle2 className="size-4 shrink-0" /> Hosted by {event.hostName}
                {event.hostContact && ` · ${event.hostContact}`}
              </p>
            )}
          </CardContent>
        </Card>

        {isManager && <EventReviewActions eventId={event.id} />}
      </div>
    );
  }

  if (event.status === "REJECTED") {
    return (
      <div className="mx-auto max-w-2xl space-y-8">
        <PageHeader title={event.title} description="This proposal was declined." />
        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">Declined</p>
              <p className="mt-1 text-sm text-muted-foreground">{event.rejectionReason}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // DRAFT (including a fresh draft or one returned via "Request Changes")
  const spaces = await prisma.space.findMany({
    where: { organizationId: actor.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title={event.title || "Untitled proposal"} description="Edit your proposal and submit it for approval." />
      <EventProposalForm
        spaces={spaces}
        changeRequestNote={event.changeRequestNote}
        defaults={{
          id: event.id,
          title: event.title,
          description: event.description ?? "",
          category: event.category,
          location: event.location ?? "",
          spaceId: event.spaceId ?? "",
          startTime: event.startTime,
          endTime: event.endTime,
          capacity: event.capacity ?? undefined,
          imageUrl: event.imageUrl ?? "",
          hostName: event.hostName ?? "",
          hostContact: event.hostContact ?? "",
          registrationDeadline: event.registrationDeadline,
          website: event.website ?? "",
          dressCode: event.dressCode ?? "",
          foodProvided: event.foodProvided,
          parkingInfo: event.parkingInfo ?? "",
          equipmentNeeded: event.equipmentNeeded,
          livestreamUrl: event.livestreamUrl ?? "",
          ticketPriceCents: event.ticketPriceCents ?? undefined,
          isPrivate: event.isPrivate,
        }}
      />
    </div>
  );
}
