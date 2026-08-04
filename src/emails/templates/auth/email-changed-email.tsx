import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type EmailChangedEmailProps = {
  fullName: string;
  newEmail: string;
  confirmUrl: string;
};

// Sent to the new address to confirm an email change request — the account
// still uses the old address until this link is clicked.
export function EmailChangedEmail({ fullName, newEmail, confirmUrl }: EmailChangedEmailProps) {
  return (
    <EmailLayout preview="Confirm your new CreatorHub360 email address">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        We received a request to change your CreatorHub360 account email to <strong>{newEmail}</strong>. Confirm the
        change below.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={confirmUrl}>Confirm new email</PrimaryButton>
      </Text>
      <Text className="email-muted" style={mutedText}>
        If you didn&apos;t request this change, you can safely ignore this email — your account email will stay the
        same.
      </Text>
    </EmailLayout>
  );
}
