import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type CollaborationRequestEmailProps = {
  fullName: string;
  requesterName: string;
  projectName: string;
  message?: string | null;
  projectUrl: string;
};

export function CollaborationRequestEmail({ fullName, requesterName, projectName, message, projectUrl }: CollaborationRequestEmailProps) {
  return (
    <EmailLayout preview={`${requesterName} wants to join ${projectName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{requesterName}</strong> requested to join <strong>{projectName}</strong>.
      </Text>
      {message && (
        <Text className="email-muted" style={{ ...mutedText, margin: "0 0 16px", fontStyle: "italic" }}>
          &ldquo;{message}&rdquo;
        </Text>
      )}
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={projectUrl}>Review request</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
