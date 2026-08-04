import { format } from "date-fns";
import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type ReservationConfirmedEmailProps = {
  fullName: string;
  spaceName: string;
  startTime: Date;
  endTime: Date;
  projectName?: string | null;
};

export function ReservationConfirmedEmail({ fullName, spaceName, startTime, endTime, projectName }: ReservationConfirmedEmailProps) {
  const items = [
    { label: "Space", value: spaceName },
    { label: "When", value: `${format(startTime, "EEEE, MMMM d")} · ${format(startTime, "h:mm a")} – ${format(endTime, "h:mm a")}` },
  ];
  if (projectName) items.push({ label: "Project", value: projectName });

  return (
    <EmailLayout preview={`Your ${spaceName} booking is confirmed`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your space booking is confirmed.
      </Text>
      <InfoCard items={items} />
      <Text className="email-text" style={bodyText}>
        See you then!
      </Text>
    </EmailLayout>
  );
}
