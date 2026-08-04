import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type EventStartingSoonEmailProps = {
  fullName: string;
  eventTitle: string;
  startTime: Date;
  location?: string | null;
};

export function EventStartingSoonEmail({ fullName, eventTitle, startTime, location }: EventStartingSoonEmailProps) {
  const items = [{ label: "Starts", value: format(startTime, "h:mm a") }];
  if (location) items.push({ label: "Where", value: location });

  return (
    <EmailLayout preview={`${eventTitle} is starting soon`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{eventTitle}</strong> is starting soon.
      </Text>
      <InfoCard items={items} />
    </EmailLayout>
  );
}
