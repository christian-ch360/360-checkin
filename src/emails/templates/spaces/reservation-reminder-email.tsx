import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type ReservationReminderEmailProps = {
  fullName: string;
  spaceName: string;
  startTime: Date;
  endTime: Date;
};

export function ReservationReminderEmail({ fullName, spaceName, startTime, endTime }: ReservationReminderEmailProps) {
  return (
    <EmailLayout preview={`Reminder: ${spaceName} coming up soon`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your space booking is coming up soon.
      </Text>
      <InfoCard
        items={[
          { label: "Space", value: spaceName },
          { label: "When", value: `${format(startTime, "h:mm a")} – ${format(endTime, "h:mm a")}` },
        ]}
      />
    </EmailLayout>
  );
}
