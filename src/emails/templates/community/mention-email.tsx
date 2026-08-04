import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type MentionEmailProps = {
  fullName: string;
  mentionerName: string;
  postTitle: string;
  commentBody: string;
  postUrl: string;
};

export function MentionEmail({ fullName, mentionerName, postTitle, commentBody, postUrl }: MentionEmailProps) {
  return (
    <EmailLayout preview={`${mentionerName} mentioned you`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{mentionerName}</strong> mentioned you in a comment on &ldquo;{postTitle}&rdquo;:
      </Text>
      <Text className="email-muted" style={{ ...mutedText, margin: "0 0 16px", fontStyle: "italic" }}>
        &ldquo;{commentBody}&rdquo;
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={postUrl}>View mention</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
