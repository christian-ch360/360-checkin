import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type NewCommentEmailProps = {
  fullName: string;
  commenterName: string;
  postTitle: string;
  commentBody: string;
  postUrl: string;
};

export function NewCommentEmail({ fullName, commenterName, postTitle, commentBody, postUrl }: NewCommentEmailProps) {
  return (
    <EmailLayout preview={`${commenterName} commented on your post`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{commenterName}</strong> commented on your post &ldquo;{postTitle}&rdquo;:
      </Text>
      <Text className="email-muted" style={{ ...mutedText, margin: "0 0 16px", fontStyle: "italic" }}>
        &ldquo;{commentBody}&rdquo;
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={postUrl}>View comment</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
