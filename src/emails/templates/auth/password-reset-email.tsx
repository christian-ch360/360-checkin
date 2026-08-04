import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type PasswordResetEmailProps = {
  fullName: string;
  resetUrl: string;
};

export function PasswordResetEmail({ fullName, resetUrl }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your CreatorHub360 password">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        We received a request to reset your CreatorHub360 password.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={resetUrl}>Reset password</PrimaryButton>
      </Text>
      <Text className="email-muted" style={mutedText}>
        If you didn&apos;t request this, you can safely ignore this email — your password will stay the same.
      </Text>
    </EmailLayout>
  );
}
