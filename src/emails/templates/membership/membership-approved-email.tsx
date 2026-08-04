import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type MembershipApprovedEmailProps = {
  fullName: string;
};

export function MembershipApprovedEmail({ fullName }: MembershipApprovedEmailProps) {
  return (
    <EmailLayout preview="Welcome to CreatorHub360">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your membership has been approved.
      </Text>
      <Text className="email-text" style={bodyText}>
        You can now log in, access CreatorHub360, and use your QR code to check into any CreatorHub360 Space.
      </Text>
    </EmailLayout>
  );
}
