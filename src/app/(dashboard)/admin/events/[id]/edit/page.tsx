import { notFound, redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EventProposalForm } from "@/features/events/components/event-proposal-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit Event" };

export default async function AdminEditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "events.manage")) redirect("/dashboard");

  const [event, spaces] = await Promise.all([
    prisma.event.findFirst({ where: { id, organizationId: actor.organizationId } }),
    prisma.space.findMany({
      where: { organizationId: actor.organizationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader title={`Edit "${event.title}"`} description="Admin direct edit — available on any status." />
      <EventProposalForm
        mode="admin-edit"
        spaces={spaces}
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
