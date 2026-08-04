import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText, mutedText } from "@/emails/components/colors";

export type PasswordChangedEmailProps = {
  fullName: string;
};

export function PasswordChangedEmail({ fullName }: PasswordChangedEmailProps) {
  return (
    <EmailLayout preview="Your CreatorHub360 password was changed">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your CreatorHub360 password was just changed.
      </Text>
      <Text className="email-muted" style={mutedText}>
        If you made this change, no further action is needed. If you didn&apos;t, contact support immediately —
        your account may be compromised.
      </Text>
    </EmailLayout>
  );
}
