import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type AgencyRequestReceivedEmailProps = {
  fullName: string;
  creatorName: string;
  reviewUrl: string;
};

export function AgencyRequestReceivedEmail({ fullName, creatorName, reviewUrl }: AgencyRequestReceivedEmailProps) {
  return (
    <EmailLayout preview={`${creatorName} wants to connect with your agency`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{creatorName}</strong> entered your Agency ID and is requesting to connect. Review their profile and
        approve or reject the request from your Agency Dashboard.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={reviewUrl}>Review request</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
