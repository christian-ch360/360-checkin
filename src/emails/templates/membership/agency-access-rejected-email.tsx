import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type AgencyAccessRejectedEmailProps = {
  fullName: string;
  agencyName: string;
};

export function AgencyAccessRejectedEmail({ fullName, agencyName }: AgencyAccessRejectedEmailProps) {
  return (
    <EmailLayout preview={`Your request to join ${agencyName} was declined`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{agencyName}</strong> declined your request to join their team. No access was granted.
      </Text>
    </EmailLayout>
  );
}
