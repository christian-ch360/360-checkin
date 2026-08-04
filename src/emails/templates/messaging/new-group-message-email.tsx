import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type NewGroupMessageEmailProps = {
  fullName: string;
  senderName: string;
  groupName: string;
  messagePreview: string;
  conversationUrl: string;
};

export function NewGroupMessageEmail({ fullName, senderName, groupName, messagePreview, conversationUrl }: NewGroupMessageEmailProps) {
  return (
    <EmailLayout preview={`New message in ${groupName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{senderName}</strong> sent a message in <strong>{groupName}</strong>:
      </Text>
      <Text className="email-muted" style={{ ...mutedText, margin: "0 0 16px", fontStyle: "italic" }}>
        &ldquo;{messagePreview}&rdquo;
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={conversationUrl}>Reply</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
