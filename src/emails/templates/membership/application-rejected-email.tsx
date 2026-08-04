import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type ApplicationRejectedEmailProps = {
  fullName: string;
};

// Deliberately no `reason` prop — the admin's internal rejection notes stay
// internal (visible only in the admin dashboard) unless a future decision
// explicitly enables surfacing them here.
export function ApplicationRejectedEmail({ fullName }: ApplicationRejectedEmailProps) {
  const firstName = fullName.split(" ")[0];

  return (
    <EmailLayout preview="An update on your CreatorHub360 application">
      <Text className="email-text" style={bodyText}>
        Hi {firstName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Thank you for your interest in CreatorHub360. After careful review, we&apos;re unable to move forward with
        your application at this time.
      </Text>
      <Text className="email-text" style={bodyText}>
        — CreatorHub360 Team
      </Text>
    </EmailLayout>
  );
}
