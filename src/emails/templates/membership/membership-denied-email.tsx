import { Link, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { bodyText, mutedText, COLORS } from "@/emails/components/colors";

export type MembershipDeniedEmailProps = {
  fullName: string;
  reason?: string | null;
  supportEmail: string;
};

export function MembershipDeniedEmail({ fullName, reason, supportEmail }: MembershipDeniedEmailProps) {
  return (
    <EmailLayout preview="An update on your CreatorHub360 membership application">
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        After review, we&apos;re unable to approve your membership application at this time.
      </Text>
      {reason ? (
        <Text className="email-text" style={bodyText}>
          {reason}
        </Text>
      ) : null}
      <Text className="email-muted" style={mutedText}>
        Questions? Reach out at{" "}
        <Link href={`mailto:${supportEmail}`} style={{ color: COLORS.accent }}>
          {supportEmail}
        </Link>
        .
      </Text>
    </EmailLayout>
  );
}
