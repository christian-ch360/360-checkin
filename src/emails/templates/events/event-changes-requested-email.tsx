import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { InfoCard } from "@/emails/components/info-card";
import { bodyText } from "@/emails/components/colors";

export type EventChangesRequestedEmailProps = {
  fullName: string;
  eventTitle: string;
  note: string;
  editUrl: string;
};

export function EventChangesRequestedEmail({ fullName, eventTitle, note, editUrl }: EventChangesRequestedEmailProps) {
  return (
    <EmailLayout preview={`Changes requested for ${eventTitle}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        An admin reviewed your proposal for <strong>{eventTitle}</strong> and asked for a few changes before it can
        be published.
      </Text>
      <InfoCard items={[{ label: "Requested changes", value: note }]} />
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={editUrl}>Edit and resubmit</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
