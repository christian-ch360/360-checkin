import { Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { bodyText } from "@/emails/components/colors";

/**
 * One generic template reused across every Team Management notification
 * (invitation sent/accepted/declined/revoked, role changed, ownership
 * transferred, member removed) rather than a near-identical bespoke
 * component per event — the headline/body text already carries the
 * event-specific content, so a dedicated template per type would only
 * duplicate layout.
 */
export type AgencyTeamActivityEmailProps = {
  fullName: string;
  headline: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
};

export function AgencyTeamActivityEmail({ fullName, headline, body, ctaUrl, ctaLabel }: AgencyTeamActivityEmailProps) {
  return (
    <EmailLayout preview={headline}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        <strong>{headline}</strong>
      </Text>
      <Text className="email-text" style={bodyText}>
        {body}
      </Text>
      {ctaUrl && (
        <Text style={{ margin: "8px 0 16px" }}>
          <PrimaryButton href={ctaUrl}>{ctaLabel ?? "View Agency Dashboard"}</PrimaryButton>
        </Text>
      )}
    </EmailLayout>
  );
}
