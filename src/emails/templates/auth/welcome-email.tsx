import { Img, Link, Text } from "@react-email/components";
import { EmailLayout } from "@/emails/layouts/email-layout";
import { PrimaryButton } from "@/emails/components/primary-button";
import { InfoCard } from "@/emails/components/info-card";
import { COLORS, bodyText, mutedText } from "@/emails/components/colors";

export type WelcomeEmailProps = {
  fullName: string;
  memberNumber: string;
  loginUrl: string;
  tempPassword: string;
  qrCodeUrl: string;
};

/**
 * Onboarding email — the only place a temp password is ever surfaced. Never
 * persisted anywhere; this render is its one use.
 */
export function WelcomeEmail({ fullName, memberNumber, loginUrl, tempPassword, qrCodeUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to CreatorHub360, ${fullName}`}>
      <Text className="email-text" style={bodyText}>
        Hi {fullName},
      </Text>
      <Text className="email-text" style={bodyText}>
        Your CreatorHub360 account has been created. Here&apos;s everything you need to get started.
      </Text>

      <InfoCard
        items={[
          { label: "Member ID", value: memberNumber },
          { label: "Temporary password", value: <span style={{ fontFamily: "monospace" }}>{tempPassword}</span> },
        ]}
      />

      <Text style={{ margin: "8px 0 16px" }}>
        <PrimaryButton href={loginUrl}>Log in to CreatorHub360</PrimaryButton>
      </Text>

      <Text className="email-muted" style={mutedText}>
        For security, please change this password after your first login. This is the only time it will be emailed to you.
      </Text>

      <Text className="email-text" style={{ ...bodyText, margin: "24px 0 12px" }}>
        Your personal QR code — scan it at any CreatorHub360 kiosk to check in:
      </Text>
      <Img src={qrCodeUrl} width={160} height={160} alt="Your CreatorHub360 QR code" style={{ borderRadius: 8 }} />
      <Text style={{ margin: "8px 0 0" }}>
        <Link href={qrCodeUrl} download={`creatorhub360-${memberNumber}.png`} style={{ fontSize: 13, color: COLORS.accent }}>
          Download QR code
        </Link>
      </Text>
    </EmailLayout>
  );
}
