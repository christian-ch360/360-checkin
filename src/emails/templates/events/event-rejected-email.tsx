import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type EventRejectedEmailProps = {
  fullName: string;
  eventTitle: string;
  reason: string;
};

export function EventRejectedEmail({ fullName, eventTitle, reason }: EventRejectedEmailProps) {
  return (
    <EmailLayout preview={`Your event proposal "${eventTitle}" was declined`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your event proposal <strong>{eventTitle}</strong> wasn&apos;t approved.
      </Text>
      <InfoCard items={[{ label: "Reason", value: reason }]} />
      <Text className="email-text" style={bodyText}>
        You&apos;re welcome to submit a new proposal any time.
      </Text>
    </EmailLayout>
  );
}
