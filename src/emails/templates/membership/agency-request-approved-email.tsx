import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type AgencyRequestApprovedEmailProps = {
  fullName: string;
  agencyName: string;
};

export function AgencyRequestApprovedEmail({ fullName, agencyName }: AgencyRequestApprovedEmailProps) {
  return (
    <EmailLayout preview={`You're now connected to ${agencyName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{agencyName}</strong> approved your request. You&apos;re now connected, and your future GMV will be
        attributed to them.
      </Text>
    </EmailLayout>
  );
}
