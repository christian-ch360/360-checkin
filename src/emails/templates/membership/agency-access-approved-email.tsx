import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type AgencyAccessApprovedEmailProps = {
  fullName: string;
  agencyName: string;
};

export function AgencyAccessApprovedEmail({ fullName, agencyName }: AgencyAccessApprovedEmailProps) {
  return (
    <EmailLayout preview={`You're now part of ${agencyName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{agencyName}</strong> approved your request. You&apos;re now part of their team and have access to
        their Agency Dashboard, existing Agency ID, and connected creator network.
      </Text>
    </EmailLayout>
  );
}
