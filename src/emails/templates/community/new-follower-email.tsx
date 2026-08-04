import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type NewFollowerEmailProps = {
  fullName: string;
  followerName: string;
  followerProfileUrl: string;
};

export function NewFollowerEmail({ fullName, followerName, followerProfileUrl }: NewFollowerEmailProps) {
  return (
    <EmailLayout preview={`${followerName} started following you`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{followerName}</strong> started following you on CreatorHub360.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={followerProfileUrl}>View profile</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
