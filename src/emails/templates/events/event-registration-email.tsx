import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type EventRegistrationEmailProps = {
  fullName: string;
  eventTitle: string;
  startTime: Date;
  location?: string | null;
};

export function EventRegistrationEmail({ fullName, eventTitle, startTime, location }: EventRegistrationEmailProps) {
  const items = [{ label: "When", value: format(startTime, "EEEE, MMMM d 'at' h:mm a") }];
  if (location) items.push({ label: "Where", value: location });

  return (
    <EmailLayout preview={`You're registered for ${eventTitle}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        You&apos;re registered for <strong>{eventTitle}</strong>.
      </Text>
      <InfoCard items={items} />
    </EmailLayout>
  );
}
