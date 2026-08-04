import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type ProjectCompletedEmailProps = {
  fullName: string;
  projectName: string;
  projectUrl: string;
};

export function ProjectCompletedEmail({ fullName, projectName, projectUrl }: ProjectCompletedEmailProps) {
  return (
    <EmailLayout preview={`${projectName} is complete`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{projectName}</strong> has been marked complete. Thanks for your work on this one.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={projectUrl}>View project</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
