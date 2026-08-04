import { Section, Text, Link } from "@react-email/components";
import { COLORS } from "@/emails/components/colors";
import { SocialLinks, type SocialLink } from "@/emails/components/social-links";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function Footer({ socialLinks = [] }: { socialLinks?: SocialLink[] }) {
  return (
    <Section style={{ padding: "20px 8px 0", textAlign: "center" }}>
      <Text className="email-muted" style={{ margin: 0, color: COLORS.muted, fontSize: 12, lineHeight: 1.6 }}>
        CreatorHub360 · The operating system for your creator campus
      </Text>
      <Text className="email-muted" style={{ margin: "4px 0 0", color: COLORS.muted, fontSize: 12 }}>
        <Link href={`${appUrl()}/settings`} style={{ color: COLORS.muted, textDecoration: "underline" }}>
          Manage email preferences
        </Link>
      </Text>
      <SocialLinks links={socialLinks} />
    </Section>
  );
}
