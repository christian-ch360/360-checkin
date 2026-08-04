import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type OrgInvitationEmailProps = {
  roleLabel: string;
  inviteUrl: string;
  expiresAt: Date;
};

/** The admin "Invite Member" / "Resend Invitation" org-join email (renamed from the old project_invitation key, which this was the only real use of). */
export function OrgInvitationEmail({ roleLabel, inviteUrl, expiresAt }: OrgInvitationEmailProps) {
  const expiryText = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <EmailLayout preview="You're invited to CreatorHub360">
      <Text className="email-text" style={bodyText}>
        You&apos;ve been invited to join CreatorHub360 as <strong>{roleLabel}</strong>.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={inviteUrl}>Accept invitation</PrimaryButton>
      </Text>
      <Text className="email-muted" style={mutedText}>
        This link expires on {expiryText}.
      </Text>
    </EmailLayout>
  );
}
