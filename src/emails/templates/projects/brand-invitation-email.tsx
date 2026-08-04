import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type BrandInvitationEmailProps = {
  projectName: string;
  roleLabel: string;
  inviteUrl: string;
  expiresAt: Date;
};

export function BrandInvitationEmail({ projectName, roleLabel, inviteUrl, expiresAt }: BrandInvitationEmailProps) {
  const expiryText = expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <EmailLayout preview={`You're invited to collaborate on ${projectName}`}>
      <Text className="email-text" style={bodyText}>
        Hi there,
      </Text>
      <Text className="email-text" style={bodyText}>
        You&apos;ve been invited to collaborate on <strong>{projectName}</strong> as <strong>{roleLabel}</strong> on
        CreatorHub360.
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
