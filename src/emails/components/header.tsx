import { Section } from "@react-email/components";
import { COLORS } from "@/emails/components/colors";
import { Logo } from "@/emails/components/logo";

// Stays dark near-black in both light and dark mode — the accent green is
// used for buttons/links/info-card highlights, not as a header background
// flood ("Apple-inspired, minimal" reads as restraint, not a green-washed page).
export function Header() {
  return (
    <Section style={{ backgroundColor: COLORS.header, padding: "24px 32px" }}>
      <Logo />
    </Section>
  );
}
