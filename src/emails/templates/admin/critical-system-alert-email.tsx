import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText, mutedText } from "@/emails/components/colors";

export type CriticalSystemAlertEmailProps = {
  fullName: string;
  template: string;
  recipient: string;
  reason: string;
};

export function CriticalSystemAlertEmail({ fullName, template, recipient, reason }: CriticalSystemAlertEmailProps) {
  return (
    <EmailLayout preview="Critical email delivery failure">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        A critical email failed to send after 3 attempts.
      </Text>
      <InfoCard
        items={[
          { label: "Template", value: template },
          { label: "Recipient", value: recipient },
          { label: "Reason", value: reason },
        ]}
      />
      <Text className="email-muted" style={mutedText}>
        Check the Resend dashboard and CreatorHub360&apos;s email logs for more detail.
      </Text>
    </EmailLayout>
  );
}
