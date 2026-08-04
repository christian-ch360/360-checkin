import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type EventCancelledEmailProps = {
  fullName: string;
  eventTitle: string;
  startTime: Date;
  reason?: string | null;
};

export function EventCancelledEmail({ fullName, eventTitle, startTime, reason }: EventCancelledEmailProps) {
  const items = [{ label: "Was scheduled for", value: format(startTime, "EEEE, MMMM d 'at' h:mm a") }];
  if (reason) items.push({ label: "Reason", value: reason });

  return (
    <EmailLayout preview={`${eventTitle} has been cancelled`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{eventTitle}</strong> has been cancelled. Sorry for the short notice.
      </Text>
      <InfoCard items={items} />
    </EmailLayout>
  );
}
