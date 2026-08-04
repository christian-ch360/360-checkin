import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText, mutedText } from "@/emails/components/colors";

export type AgencyRequestRejectedEmailProps = {
  fullName: string;
  agencyName: string;
};

export function AgencyRequestRejectedEmail({ fullName, agencyName }: AgencyRequestRejectedEmailProps) {
  return (
    <EmailLayout preview={`Your request to ${agencyName} was declined`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{agencyName}</strong> declined your connection request. No agency relationship was created.
      </Text>
      <Text className="email-muted" style={mutedText}>
        You can request a different agency any time from Settings.
      </Text>
    </EmailLayout>
  );
}
