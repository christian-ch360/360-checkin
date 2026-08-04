import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type ProjectApprovedEmailProps = {
  fullName: string;
  projectName: string;
  projectUrl: string;
};

export function ProjectApprovedEmail({ fullName, projectName, projectUrl }: ProjectApprovedEmailProps) {
  return (
    <EmailLayout preview={`${projectName} is now active`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{projectName}</strong> has been approved and is now active.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={projectUrl}>View project</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
