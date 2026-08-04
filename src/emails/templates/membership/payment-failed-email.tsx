import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText, mutedText } from "@/emails/components/colors";

export type PaymentFailedEmailProps = {
  fullName: string;
  planName: string;
  supportEmail: string;
};

export function PaymentFailedEmail({ fullName, planName, supportEmail }: PaymentFailedEmailProps) {
  return (
    <EmailLayout preview="We couldn't process your CreatorHub360 payment">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        We weren&apos;t able to process the renewal payment for your <strong>{planName}</strong> membership. Your
        account remains active for now, but please reach out to sort out billing.
      </Text>
      <Text className="email-muted" style={mutedText}>
        Contact {supportEmail} for help.
      </Text>
    </EmailLayout>
  );
}
