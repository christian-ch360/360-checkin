import { requireCurrentMember } from "@/features/auth/services/current-member";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EventProposalForm } from "@/features/events/components/event-proposal-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Propose an Event" };

export default async function ProposeEventPage() {
  const actor = await requireCurrentMember();

  const spaces = await prisma.space.findMany({
    where: { organizationId: actor.organizationId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Propose an event"
        description="Submit for admin review — it won't be published until approved."
      />
      <EventProposalForm spaces={spaces} />
    </div>
  );
}
