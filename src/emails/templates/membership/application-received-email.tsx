import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type ApplicationReceivedEmailProps = {
  fullName: string;
};

export function ApplicationReceivedEmail({ fullName }: ApplicationReceivedEmailProps) {
  const firstName = fullName.split(" ")[0];

  return (
    <EmailLayout preview="We've received your CreatorHub360 application">
      <Text className="email-text" style={bodyText}>
        Hi {firstName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Thanks for applying to CreatorHub360. We&apos;ve received your application and our team is reviewing it now.
        We&apos;ll be in touch soon with an update.
      </Text>
      <Text className="email-text" style={bodyText}>
        — CreatorHub360 Team
      </Text>
    </EmailLayout>
  );
}
