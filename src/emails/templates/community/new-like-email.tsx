import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type NewLikeEmailProps = {
  fullName: string;
  likerName: string;
  postTitle: string;
  postUrl: string;
};

export function NewLikeEmail({ fullName, likerName, postTitle, postUrl }: NewLikeEmailProps) {
  return (
    <EmailLayout preview={`${likerName} liked your post`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{likerName}</strong> liked your post &ldquo;{postTitle}&rdquo;.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={postUrl}>View post</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
