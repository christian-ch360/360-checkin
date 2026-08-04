import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type NewCreatorJoinedAdminEmailProps = {
  fullName: string;
  creatorName: string;
  memberUrl: string;
};

export function NewCreatorJoinedAdminEmail({ fullName, creatorName, memberUrl }: NewCreatorJoinedAdminEmailProps) {
  return (
    <EmailLayout preview={`${creatorName} just joined`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{creatorName}</strong> just joined CreatorHub360 as a creator.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={memberUrl}>View profile</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
