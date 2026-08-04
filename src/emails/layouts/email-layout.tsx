import { Body, Container, Head, Html, Preview, Section } from "@react-email/components";
import type { ReactNode } from "react";
import { COLORS, FONT_STACK } from "@/emails/components/colors";
import { Header } from "@/emails/components/header";
import { Footer } from "@/emails/components/footer";

// Email clients render statically (no JS, no React context) — dark mode is
// done via a <style> block matching @media (prefers-color-scheme: dark)
// against classNames, layered on top of inline-style light defaults so
// clients that ignore the media query (Outlook desktop) still render
// correctly. Gmail and Apple Mail honor this; Outlook doesn't — a known,
// unavoidable email-client limitation, not a bug.
const DARK_MODE_STYLE = `
  @media (prefers-color-scheme: dark) {
    .email-bg { background-color: ${COLORS.darkPageBg} !important; }
    .email-card { background-color: ${COLORS.darkCard} !important; }
    .email-text, .email-heading { color: ${COLORS.darkText} !important; }
    .email-muted { color: ${COLORS.darkMuted} !important; }
    .email-divider { border-color: ${COLORS.darkBorder} !important; }
    .email-info-card { background-color: #27272a !important; border-color: ${COLORS.darkBorder} !important; }
  }
`;

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html>
      <Head>
        <style>{DARK_MODE_STYLE}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="email-bg" style={{ margin: 0, padding: 0, backgroundColor: COLORS.pageBg, fontFamily: FONT_STACK }}>
        <Section style={{ padding: "32px 16px" }}>
          <Container
            className="email-card"
            style={{ maxWidth: 480, backgroundColor: COLORS.card, borderRadius: 16, overflow: "hidden" }}
          >
            <Header />
            <Section className="email-text" style={{ padding: 32, color: COLORS.text, fontSize: 15, lineHeight: 1.6 }}>
              {children}
            </Section>
          </Container>
          <Footer />
        </Section>
      </Body>
    </Html>
  );
}
