import type { ReactNode } from "react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listAllConversationsForMember } from "@/features/messaging/services/conversation.service";
import { MessagesShell } from "@/features/messaging/components/messages-shell";
import { PageHeader } from "@/components/shared/page-header";
import { isDemoModeActive, demoListAllConversationsForMember } from "@/features/demo-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Messages" };

// Conversations are fetched once here, at the layout level, so the list
// pane persists across navigation between /messages and
// /messages/[conversationId] instead of remounting and refetching per page.
export default async function MessagesLayout({ children }: { children: ReactNode }) {
  const actor = await requireCurrentMember();
  const conversations = isDemoModeActive(actor)
    ? demoListAllConversationsForMember()
    : await listAllConversationsForMember(actor.id);

  return (
    <div className="flex h-[75vh] min-h-[420px] flex-col gap-4">
      <div className="md:hidden">
        <PageHeader title="Messages" description="Direct messages and Collab Hub conversations." />
      </div>
      <MessagesShell conversations={conversations}>{children}</MessagesShell>
    </div>
  );
}
