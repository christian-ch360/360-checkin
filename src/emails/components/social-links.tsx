import { Link, Row, Column } from "@react-email/components";
import { COLORS } from "@/emails/components/colors";

export type SocialLink = { label: string; url: string };

export function SocialLinks({ links }: { links: SocialLink[] }) {
  if (links.length === 0) return null;

  return (
    <Row style={{ width: "auto", margin: "12px auto 0" }}>
      {links.map((link, i) => (
        <Column key={link.url} style={{ paddingRight: i < links.length - 1 ? 16 : 0 }}>
          <Link href={link.url} style={{ color: COLORS.muted, fontSize: 12, textDecoration: "underline" }}>
            {link.label}
          </Link>
        </Column>
      ))}
    </Row>
  );
}
