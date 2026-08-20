import { Body, Container, Head, Html, Img, Preview, Text } from "@react-email/components";

// Record<never, never> (not Record<string, never>) — an index signature
// would make this type incompatible when intersected with EmailService's
// SendArgs<K>, which also carries string-keyed props like `to`/`organizationId`.
export type WelcomeNewsletterEmailProps = Record<never, never>;

// Hosted in the "email-assets" Supabase Storage bucket (public bucket,
// idempotent ensure/upload helpers in src/lib/supabase/storage.ts) — uploaded
// via prisma/upload-welcome-newsletter.ts from the approved source artwork at
// images/newsletter.png. Never a local file path: email clients have no
// access to this app's filesystem.
//
// The filename is content-hashed (...-6e090daab7cf.png), not a fixed name.
// A fixed name that gets overwritten in place is exactly what causes
// mail-provider image proxies (Apple Mail Privacy Protection, Gmail's image
// proxy, etc.) to keep serving stale cached bytes for that URL after the
// artwork changes underneath it — those proxies cache per-URL on their own
// infrastructure and don't reliably respect origin cache-control headers.
// Whenever images/newsletter.png changes: re-run
// prisma/upload-welcome-newsletter.ts and paste the new URL it prints here —
// a changed image is then never the same URL as before, so no proxy can ever
// have a stale copy of it, and nothing needs to be memorized about cache
// invalidation.
const NEWSLETTER_IMAGE_URL =
  "https://aofzeshdlmtlyncdewqm.supabase.co/storage/v1/object/public/email-assets/welcome-newsletter-6e090daab7cf.png";

// Source artwork is 1024x3072px (exact 1:3 ratio). Display width is ~600px
// per spec; height is derived from the source aspect ratio so the whole
// continuous long-form newsletter scales down without cropping or
// distortion. Keep this in sync with images/newsletter.png's actual
// dimensions whenever the artwork is replaced — re-run
// prisma/upload-welcome-newsletter.ts after any change to that file.
const IMAGE_WIDTH = 600;
const IMAGE_HEIGHT = Math.round((IMAGE_WIDTH * 3072) / 1024);

// Full transcription of the artwork's text, for screen readers and as the
// fallback shown by email clients that block remote images by default —
// this is the "sensible fallback" for a template that is otherwise a single
// image with no visible HTML text layer.
const NEWSLETTER_ALT_TEXT =
  "CreatorHub360 welcome newsletter. Welcome to CreatorHub360 — you've been accepted to our invite only community! " +
  "Our mission this year: to sign 200 content creators, train, empower, and activate their online shops across " +
  "multi channels. Our mission — our goal: identify which products your current audience wants to buy and plan to " +
  "build your own personal brand. To generate $1,000,000 GMV/Revenue for your store in the next 365 days. " +
  "What we need from you: to be open minded; schedule weekly availability — to stop by our office to train, learn, " +
  "and work with our strategists and e commerce team, 2 days in person meeting suggested weekly; build a moodboard " +
  "of your favorite brands, products, what you desire to sell. Your main point of contact: Phone +1 (213) 435-2482, " +
  "Email cassiphias@creatorhub360.com. We're excited to build the future with you.";

// Gmail/Apple Mail/most mobile mail apps honor this; the fluid width:100%
// on the Img itself (below) is what actually does the shrinking — this
// media query just makes the intent explicit and covers clients that need
// the !important override to beat inline styles.
const RESPONSIVE_STYLE = `
  @media (max-width: 620px) {
    .ch360-newsletter-image { width: 100% !important; height: auto !important; }
  }
`;

/**
 * Reproduces the CreatorHub360 welcome newsletter exactly as designed: the
 * complete, approved flattened artwork rendered as one continuous image, per
 * explicit instruction not to redesign, rewrite, rearrange, recolor, or
 * reinterpret it. Deliberately does not use the shared EmailLayout's
 * branded header/footer (that shell isn't part of the source design), and
 * takes no props — the source artwork has no personalization field.
 */
export function WelcomeNewsletterEmail() {
  return (
    <Html>
      <Head>
        <style>{RESPONSIVE_STYLE}</style>
      </Head>
      <Preview>You&apos;ve been accepted to our invite only community!</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: "#f6f6f6" }}>
        <Container style={{ maxWidth: IMAGE_WIDTH, width: "100%", margin: "0 auto", padding: 0, backgroundColor: "#f6f6f6" }}>
          {/*
            Visually hidden (not shown in any HTML-rendering client — same
            "hidden preheader" CSS trick every ESP uses) but present in the
            DOM so the plain-text MIME alternative isn't empty for the rare
            text-only client. Exact same words as the Img's alt text below,
            not new copy — this never changes what a sighted reader sees.
          */}
          <Text style={{ display: "none", overflow: "hidden", lineHeight: 1, maxHeight: 0, maxWidth: 0, opacity: 0 }}>
            {NEWSLETTER_ALT_TEXT}
          </Text>
          <Img
            src={NEWSLETTER_IMAGE_URL}
            alt={NEWSLETTER_ALT_TEXT}
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            className="ch360-newsletter-image"
            style={{
              display: "block",
              width: "100%",
              maxWidth: IMAGE_WIDTH,
              height: "auto",
              border: 0,
              outline: "none",
              textDecoration: "none",
              backgroundColor: "#f6f6f6",
            }}
          />
        </Container>
      </Body>
    </Html>
  );
}
