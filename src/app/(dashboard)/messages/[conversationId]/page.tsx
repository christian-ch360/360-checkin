import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getConversationWithMessages } from "@/features/collab-hub/services/conversation.service";
import { getDirectConversationWithMessages } from "@/features/messaging/services/conversation.service";
import { prisma } from "@/lib/db/prisma";
import { MessageThread as CollabMessageThread } from "@/features/collab-hub/components/message-thread";
import { MessageThread as DirectMessageThread } from "@/features/messaging/components/message-thread";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function ThreadHeader({
  name,
  subtitle,
  photoUrl,
}: {
  name: string;
  subtitle: string;
  photoUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link href="/messages" className="text-muted-foreground hover:text-foreground md:hidden">
        <ArrowLeft className="size-4" />
      </Link>
      <Avatar className="size-8 shrink-0">
        {photoUrl && <AvatarImage src={photoUrl} />}
        <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId: routeId } = await params;
  const actor = await requireCurrentMember();

  if (routeId.startsWith("dm_")) {
    const id = routeId.slice(3);
    const conversation = await getDirectConversationWithMessages(id, actor.id);
    if (!conversation || !conversation.other) notFound();

    return (
      <div className="flex h-full flex-col gap-3">
        <ThreadHeader
          name={conversation.isGroup ? (conversation.name ?? "Group chat") : conversation.other.fullName}
          subtitle={conversation.isGroup ? `${conversation.participants.length} members` : "Direct message"}
          photoUrl={conversation.isGroup ? null : conversation.other.profilePhotoUrl}
        />
        <DirectMessageThread
          conversationId={id}
          currentMemberId={actor.id}
          isGroup={conversation.isGroup}
          initialMessages={conversation.messages}
          initialOtherLastReadAt={
            conversation.participants.find((p) => p.memberId !== actor.id)?.lastReadAt ?? null
          }
          initialReactionsByMessageId={conversation.reactionsByMessageId}
        />
      </div>
    );
  }

  if (routeId.startsWith("collab_")) {
    const id = routeId.slice(7);
    const conversation = await getConversationWithMessages(id, actor.id);
    if (!conversation) notFound();

    const isPoster = conversation.posterId === actor.id;
    const other = isPoster ? conversation.initiator : conversation.poster;
    const initialOtherLastReadAt = isPoster ? conversation.initiatorLastReadAt : conversation.posterLastReadAt;

    const [projects, reservations] = await Promise.all([
      prisma.project.findMany({
        where: { organizationId: actor.organizationId, status: { in: ["PLANNING", "ACTIVE"] } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 50,
      }),
      prisma.reservation.findMany({
        where: { memberId: actor.id, status: "CONFIRMED", endTime: { gte: new Date() } },
        select: { id: true, startTime: true, space: { select: { name: true } } },
        orderBy: { startTime: "asc" },
        take: 20,
      }),
    ]);

    return (
      <div className="flex h-full flex-col gap-3">
        <ThreadHeader
          name={other.fullName}
          subtitle={`via Collab Hub · ${conversation.collabPost.title}`}
          photoUrl={other.profilePhotoUrl}
        />
        <CollabMessageThread
          conversationId={id}
          currentMemberId={actor.id}
          initialMessages={conversation.messages}
          initialOtherLastReadAt={initialOtherLastReadAt}
          projects={projects}
          reservations={reservations.map((r) => ({
            id: r.id,
            label: `${r.space.name} · ${format(r.startTime, "MMM d, h:mm a")}`,
          }))}
        />
      </div>
    );
  }

  notFound();
}
