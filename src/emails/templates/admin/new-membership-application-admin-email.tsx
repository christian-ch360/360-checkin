import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { InfoCard } from "@/emails/components/info-card";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

export type NewMembershipApplicationAdminEmailProps = {
  fullName: string;
  applicantName: string;
  applicantEmail: string;
  role: string;
  reviewUrl: string;
};

export function NewMembershipApplicationAdminEmail({
  fullName,
  applicantName,
  applicantEmail,
  role,
  reviewUrl,
}: NewMembershipApplicationAdminEmailProps) {
  return (
    <EmailLayout preview={`New application from ${applicantName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        A new membership application was submitted.
      </Text>
      <InfoCard
        items={[
          { label: "Name", value: applicantName },
          { label: "Email", value: applicantEmail },
          { label: "Role", value: role },
        ]}
      />
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={reviewUrl}>Review application</PrimaryButton>
      </Text>
    </EmailLayout>
  );
}
