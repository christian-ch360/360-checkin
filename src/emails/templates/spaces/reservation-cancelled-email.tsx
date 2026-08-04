import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type ReservationCancelledEmailProps = {
  fullName: string;
  spaceName: string;
  startTime: Date;
};

export function ReservationCancelledEmail({ fullName, spaceName, startTime }: ReservationCancelledEmailProps) {
  return (
    <EmailLayout preview={`Your ${spaceName} booking was cancelled`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your space booking has been cancelled.
      </Text>
      <InfoCard
        items={[
          { label: "Space", value: spaceName },
          { label: "Was scheduled for", value: format(startTime, "EEEE, MMMM d 'at' h:mm a") },
        ]}
      />
    </EmailLayout>
  );
}
