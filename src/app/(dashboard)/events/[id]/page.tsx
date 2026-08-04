import { notFound, redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { getEventDetail } from "@/features/events/services/events.service";
import { incrementEventView } from "@/features/events/services/event-analytics.service";
import { EventDetail } from "@/features/events/components/event-detail";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  const event = await getEventDetail(actor.organizationId, id);
  if (!event) notFound();

  // Unpublished proposals are only visible to their owner or an events.manage holder —
  // this page is the public event surface, not the proposal review surface.
  if (event.status !== "PUBLISHED") {
    const isManager = hasPermission(actor.systemRole, "events.manage");
    if (event.createdById !== actor.id && !isManager) notFound();
    redirect(`/events/proposals/${event.id}`);
  }

  await incrementEventView(id);

  return (
    <EventDetail
      event={event}
      currentMemberId={actor.id}
      isManager={hasPermission(actor.systemRole, "events.manage")}
    />
  );
}
