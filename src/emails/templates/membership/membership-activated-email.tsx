import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText } from "@/emails/components/colors";

export type MembershipActivatedEmailProps = {
  fullName: string;
  planName: string;
};

export function MembershipActivatedEmail({ fullName, planName }: MembershipActivatedEmailProps) {
  return (
    <EmailLayout preview="Your CreatorHub360 membership is now active">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your trial has ended and your <strong>{planName}</strong> membership is now active. Thanks for being part of
        CreatorHub360.
      </Text>
    </EmailLayout>
  );
}
