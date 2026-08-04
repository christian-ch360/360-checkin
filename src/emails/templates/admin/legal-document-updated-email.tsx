import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText, mutedText } from "@/emails/components/colors";

export type LegalDocumentUpdatedEmailProps = {
  fullName: string;
  documentTitle: string;
  version: string;
  effectiveDate: string;
  reviewUrl: string;
  reacceptUrl: string;
};

export function LegalDocumentUpdatedEmail({
  fullName,
  documentTitle,
  version,
  effectiveDate,
  reviewUrl,
  reacceptUrl,
}: LegalDocumentUpdatedEmailProps) {
  const effectiveDateText = new Date(effectiveDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <EmailLayout preview={`${documentTitle} has been updated to v${version}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Our <strong>{documentTitle}</strong> has been updated to <strong>version {version}</strong>, effective{" "}
        {effectiveDateText}. Because this is a major update, you&apos;ll need to review and accept it before you can
        continue using CreatorHub360.
      </Text>
      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={reacceptUrl}>Review &amp; Accept</PrimaryButton>
      </Text>
      <Text className="email-muted" style={mutedText}>
        You can read the full updated document at{" "}
        <a href={reviewUrl} style={{ color: "inherit" }}>
          {reviewUrl}
        </a>
        .
      </Text>
    </EmailLayout>
  );
}
