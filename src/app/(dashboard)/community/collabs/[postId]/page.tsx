import { notFound } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getCollabPostById } from "@/features/collab-hub/services/collab-post.service";
import { CollabPostDetail } from "@/features/collab-hub/components/collab-post-detail";

export const dynamic = "force-dynamic";

export default async function CollabPostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const actor = await requireCurrentMember();
  const post = await getCollabPostById(actor.organizationId, postId, actor.id);
  if (!post) notFound();

  return <CollabPostDetail post={post} currentMemberId={actor.id} />;
}
