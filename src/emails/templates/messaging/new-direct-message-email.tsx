import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type NewDirectMessageEmailProps = {
  fullName: string;
  senderName: string;
  messagePreview: string;
  conversationUrl: string;
};

export function NewDirectMessageEmail({ fullName, senderName, messagePreview, conversationUrl }: NewDirectMessageEmailProps) {
  return (
    <EmailLayout preview={`New message from ${senderName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{senderName}</strong> sent you a message:
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
