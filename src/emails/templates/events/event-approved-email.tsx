import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type EventApprovedEmailProps = {
  fullName: string;
  eventTitle: string;
  startTime: Date;
  eventUrl: string;
};

export function EventApprovedEmail({ fullName, eventTitle, startTime, eventUrl }: EventApprovedEmailProps) {
  return (
    <EmailLayout preview={`${eventTitle} was approved and published`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Good news — your event proposal <strong>{eventTitle}</strong> was approved and is now live on CreatorHub360.
      </Text>
      <InfoCard items={[{ label: "When", value: format(startTime, "EEEE, MMMM d 'at' h:mm a") }]} />
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={eventUrl}>View event</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
