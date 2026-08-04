import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type ConversationInvitationEmailProps = {
  fullName: string;
  starterName: string;
  isGroup: boolean;
  groupName?: string | null;
  conversationUrl: string;
};

export function ConversationInvitationEmail({
  fullName,
  starterName,
  isGroup,
  groupName,
  conversationUrl,
}: ConversationInvitationEmailProps) {
  return (
    <EmailLayout preview={isGroup ? `${starterName} added you to a group chat` : `${starterName} started a conversation with you`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        {isGroup ? (
          <>
            <strong>{starterName}</strong> added you to{groupName ? ` "${groupName}"` : " a group chat"} on
            CreatorHub360.
          </>
        ) : (
          <>
            <strong>{starterName}</strong> started a conversation with you on CreatorHub360.
          </>
        )}
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={conversationUrl}>Open conversation</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
