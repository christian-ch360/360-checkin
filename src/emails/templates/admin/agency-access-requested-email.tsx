import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type AgencyAccessRequestedEmailProps = {
  fullName: string;
  requesterName: string;
  reviewUrl: string;
};

export function AgencyAccessRequestedEmail({ fullName, requesterName, reviewUrl }: AgencyAccessRequestedEmailProps) {
  return (
    <EmailLayout preview={`${requesterName} wants to join your agency`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{requesterName}</strong> is requesting access to your agency&apos;s CreatorHub360 dashboard. Review
        and approve or reject the request from your Agency Dashboard.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={reviewUrl}>Review request</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
