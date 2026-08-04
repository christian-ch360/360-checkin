import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type EventReminderEmailProps = {
  fullName: string;
  eventTitle: string;
  startTime: Date;
  location?: string | null;
};

export function EventReminderEmail({ fullName, eventTitle, startTime, location }: EventReminderEmailProps) {
  const items = [{ label: "When", value: format(startTime, "EEEE, MMMM d 'at' h:mm a") }];
  if (location) items.push({ label: "Where", value: location });

  return (
    <EmailLayout preview={`${eventTitle} is tomorrow`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Just a reminder — <strong>{eventTitle}</strong> is coming up.
      </Text>
      <InfoCard items={items} />
    </EmailLayout>
  );
}
