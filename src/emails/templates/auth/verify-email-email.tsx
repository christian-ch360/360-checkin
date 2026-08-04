import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type VerifyEmailEmailProps = {
  fullName: string;
  verifyUrl: string;
};

export function VerifyEmailEmail({ fullName, verifyUrl }: VerifyEmailEmailProps) {
  return (
    <EmailLayout preview="Verify your CreatorHub360 email address">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Confirm your email address to finish setting up your CreatorHub360 account.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={verifyUrl}>Verify email</PrimaryButton>
      </Text>
      <Text className="email-muted" style={mutedText}>
        If you didn&apos;t create a CreatorHub360 account, you can safely ignore this email.
      </Text>
    </EmailLayout>
  );
}
