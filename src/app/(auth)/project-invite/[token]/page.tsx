import { notFound } from "next/navigation";
import { getProjectInvitationPreview } from "@/features/projects/services/invitation-actions";
import { AcceptInvitationCard } from "@/features/projects/components/accept-invitation-card";

export const dynamic = "force-dynamic";

export default async function ProjectInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getProjectInvitationPreview(token);
  if (!invitation) notFound();

  return <AcceptInvitationCard token={token} projectName={invitation.projectName} roleLabel={invitation.roleLabel} />;
}
