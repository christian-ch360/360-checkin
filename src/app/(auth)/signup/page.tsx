import { redirect } from "next/navigation";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getValidInvitation } from "@/features/admin/services/invitations.service";

/**
 * Public self-service signup no longer exists — /apply is the only way a
 * new person can request access (see MembershipApplication). This route
 * survives solely to complete already-sent admin invitations: a missing or
 * invalid ?invite= token sends the visitor to /apply instead of rendering a
 * form that could create an account with no application behind it.
 */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const invitation = invite ? await getValidInvitation(invite) : null;

  if (!invitation) {
    redirect("/apply");
  }

  return <SignupForm invitation={{ token: invite!, email: invitation.email, role: invitation.role }} />;
}
