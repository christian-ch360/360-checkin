import { Body, Head, Html, Img, Link, Preview, Text } from "@react-email/components";

export type CreatorHubAcademyKickoffEmailProps = {
  /** Recipient's full name, if known. Personalization derives "Hey {firstName}!" from this — same
   * fullName -> firstName convention as flattenTemplateVariables in template-interpolation.ts. When
   * absent, greets with "Hey there!" rather than showing a blank or a raw placeholder. */
  fullName?: string | null;
};

// A CreatorHub360 email only — no relationship to the separate Charmzone
// kiosk project. The hero banner is the one asset kept from the original
// artwork verbatim (per explicit instruction); every other icon below it was
// recolored from the original green to this revision's black/ivory system —
// see the duotone-recolor step in this template's build history. Uploaded to
// the "email-assets" Supabase Storage bucket — see
// prisma/upload-matcha-networking-event-assets.ts (hero/QR/steps/social) and
// the black-icon upload script run alongside this revision. Content-hashed
// filenames, same anti-mail-proxy-caching reasoning as NEWSLETTER_IMAGE_URL
// in welcome-newsletter-email.tsx.
const ASSET_BASE = "https://aofzeshdlmtlyncdewqm.supabase.co/storage/v1/object/public/email-assets";
const HERO_IMAGE_URL = `${ASSET_BASE}/ch360-matcha-hero-447e5a6640ca.png`;
const QR_IMAGE_URL = `${ASSET_BASE}/ch360-matcha-qr-code-e521250ae15b.png`;
const CLIPBOARD_ICON_URL = `${ASSET_BASE}/ch360-academy-clipboard-icon-black-1a693bf59be8.png`;
// This went through two prior fixes before landing here: (1) the original
// recolored crop was fully opaque RGB with a near-white background baked
// in, which showed as a visible box at small display size — fixed by
// masking to the badge's own measured geometry (122x83, an oval, not a
// perfect circle) and exporting with true alpha transparency; (2) that
// transparent (RGBA) PNG then rendered as a broken-image placeholder in an
// actual delivered Gmail test send, despite being a valid, standard,
// non-interlaced 8-bit PNG that loaded fine everywhere I could directly
// test it (curl, this app's own browser preview) — consistent with a known
// class of real-world Gmail image-proxy incompatibility with small
// alpha-transparent PNGs, not a broken URL or a malformed file. Fixed by
// removing the alpha channel entirely: the same masked badge is composited
// onto a flat, fully opaque background matching the QR card's own color
// exactly (#F3F1EA) and re-exported as plain RGB — visually identical to
// true transparency in the one place this icon is ever used, but with zero
// alpha-channel risk for any email client's image handling.
const CALENDAR_ICON_URL = `${ASSET_BASE}/ch360-academy-calendar-icon-opaque-5850f46744c6.png`;
// Native asset is 122x83 (~1.47:1) — display dimensions below preserve that
// ratio exactly so the oval badge is never stretched into a circle.
const COMMUNITY_ICON_URL = `${ASSET_BASE}/ch360-academy-community-icon-black-ab4d2974d1b7.png`;
// Single authoritative composite image (all three numbered steps, phone
// screenshots, arrows, and copy already baked in by design) supplied
// directly by the user as the source of truth for this section — used
// byte-for-byte as uploaded, not re-cropped or recreated. Replaces the
// earlier three-separate-screenshot layout entirely. Native size 1748x1378
// (~1.269:1) — the display width/height below preserve that ratio exactly.
const TIKTOK_GUIDE_IMAGE_URL = `${ASSET_BASE}/ch360-academy-tiktok-guide-88d15e274d11.png`;
// Re-composited from the original crops onto the footer's own background
// color (#1A1A1A) — the originals were opaque RGB with a dark *green*
// background baked in (cropped back when the footer was still green),
// which left a visible mismatched square behind each icon now that the
// footer is black. Same fix pattern as the calendar icon: flat opaque RGB,
// no alpha channel, background color matched exactly to where it's placed.
const INSTAGRAM_ICON_URL = `${ASSET_BASE}/ch360-academy-social-instagram-59b8808df733.png`;
const TIKTOK_ICON_URL = `${ASSET_BASE}/ch360-academy-social-tiktok-1d6f34b96508.png`;
// Real CreatorHub360 profiles, supplied directly — not invented.
const INSTAGRAM_PROFILE_URL = "https://www.instagram.com/creatorhub.360/";
const TIKTOK_PROFILE_URL = "https://www.tiktok.com/@creatorhub360";

// Decoded directly from the QR code's own pixels (verified with `zbarimg`
// against the hosted QR_IMAGE_URL — it decodes to exactly this URL) — not
// invented, and not a Charmzone destination of any kind. Unchanged from the
// prior revision per instruction ("The QR itself should remain unchanged if
// it is already correct"). This is also where the QR image's <Link> wrapper
// sends a click, for anyone viewing on a device that can't scan.
const QR_DESTINATION_URL = "https://creatorhub360.com/pages/creator-program";

// Read directly off the reference artwork's checklist card ("Sign up on
// Partiful – <url>") — not invented. If this event's Partiful link ever
// changes, update it here.
const PARTIFUL_URL = "https://partiful.com/e/rYXW8xhPRvsmo1iSlIuL?c=XN8ik5EH";

// Black + white + warm ivory — replaces the prior green system entirely
// (per explicit instruction; the ONLY exception is the hero banner image,
// which is kept as-is and never recolored). Exact hex values as specified.
const BLACK = "#111111"; // primary black — headings, body text, icon badges
const BLACK_SECONDARY = "#1A1A1A"; // footer background
const WHITE = "#FFFFFF";
const IVORY = "#F8F7F2"; // page background
const IVORY_LIGHT = "#F3F1EA"; // card background
const BORDER = "#D8D5CC"; // thin card borders
const TEXT = "#111111";
const TEXT_SECONDARY = "#555555"; // muted/secondary copy

const FONT_STACK = "Arial, Helvetica, sans-serif";
const CONTAINER_WIDTH = 700;

// The two/three-"column" sections below are real <table> markup ONLY at
// their outer single-column skeleton — the columns themselves are plain
// display:inline-block <div>s with a fixed pixel width (the "fluid hybrid"
// technique), not react-email's Row/Column (which render actual <td>s).
// Setting display:block on a <td> while its parent stays a <tr> produces
// inconsistent layout across browsers/clients (a <tr> expects table-cell
// children) — confirmed by rendering an earlier version of this template and
// inspecting it, not assumed. inline-block <div>s don't have that failure
// mode: on a wide viewport they sit side by side because there's room;
// below the media breakpoint the !important override forces each to full
// width and they naturally wrap to their own line, exactly like words in a
// sentence.
//
// No <style>/media-query support is assumed by mail clients in general, but
// this component is a real React Email component rendered via `render()` —
// unlike an admin-authored custom-template override (which is stripped of
// <style>/<head> by the HTML sanitizer before it ever reaches an inbox, see
// template-html-sanitize.ts), nothing here goes through that sanitizer, so a
// <style> block in <Head> survives completely intact. Gmail app, iOS/macOS
// Mail, and Outlook.com webmail all honor this; Outlook desktop (the Word
// rendering engine) ignores <style>/media queries entirely and simply keeps
// every column at its fixed pixel width side-by-side — a safe, unbroken
// fallback on a client that's virtually never used on a narrow screen.
const RESPONSIVE_STYLE = `
  @media (max-width: 640px) {
    .ch360-hero-img { width: 100% !important; height: auto !important; }
    .ch360-stack-col { display: block !important; width: 100% !important; max-width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; }
    .ch360-qr-col { margin-top: 20px !important; }
  }
`;

function InitialGreeting({ fullName }: { fullName?: string | null }) {
  const firstName = fullName?.trim() ? fullName.trim().split(/\s+/)[0] : null;
  return <>Hey {firstName ?? "there"}!</>;
}

/**
 * CreatorHUB Academy Kick Off — Matcha & Coffee invitation. A real, modular
 * responsive email (hero image + selectable text + a functional QR code +
 * real screenshots), not one flattened graphic. Deliberately does not use
 * the shared EmailLayout (that shell's dark generic header/footer and 480px
 * container would fight this design's own wide, fully-branded hero and
 * footer) — same precedent as WelcomeNewsletterEmail.
 *
 * A CreatorHub360 email only. No relationship to the Charmzone kiosk project
 * (a separate feature in this codebase) — this template, its assets, and
 * its QR destination are all CreatorHub360-only; see QR_DESTINATION_URL's
 * comment above for exactly how that destination was determined.
 */
export function CreatorHubAcademyKickoffEmail({ fullName }: CreatorHubAcademyKickoffEmailProps) {
  return (
    <Html>
      <Head>
        <style>{RESPONSIVE_STYLE}</style>
      </Head>
      <Preview>Join us for the CreatorHUB Academy Kick Off and connect with fellow creators.</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: IVORY, fontFamily: FONT_STACK }}>
        <table
          role="presentation"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ backgroundColor: IVORY }}
        >
          <tbody>
            <tr>
              <td align="center">
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ maxWidth: CONTAINER_WIDTH, width: "100%" }}
                >
                  <tbody>
                    {/* 1. Hero image — kept exactly as-is, never recolored */}
                    <tr>
                      <td>
                        <Img
                          src={HERO_IMAGE_URL}
                          alt="CreatorHub360 — Connect. Collaborate. Grow. An iced matcha latte and pastries on a wood table."
                          width={CONTAINER_WIDTH}
                          className="ch360-hero-img"
                          style={{ display: "block", width: "100%", maxWidth: CONTAINER_WIDTH, height: "auto", border: 0 }}
                        />
                      </td>
                    </tr>

                    {/* 2. Intro (left) + QR card (right) — fluid-hybrid inline-block columns, see RESPONSIVE_STYLE */}
                    <tr>
                      <td style={{ padding: "40px 40px 8px" }}>
                        <div
                          className="ch360-stack-col"
                          style={{ display: "inline-block", verticalAlign: "top", width: 360, maxWidth: 360 }}
                        >
                          <Text style={{ margin: "0 0 18px", fontSize: 30, fontWeight: 700, color: TEXT, lineHeight: 1.15 }}>
                            <InitialGreeting fullName={fullName} />
                          </Text>
                          <Text style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.7, color: TEXT }}>
                            This is Christian from CreatorHub360.
                            <br />
                            We saw you were interested in what we do.
                          </Text>
                          <Text style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: TEXT }}>
                            Come to our <strong style={{ color: BLACK }}>CreatorHUB Academy Kick Off — Matcha &amp; Coffee</strong>{" "}
                            where you&rsquo;ll meet fellow creators and learn more about us.
                          </Text>
                        </div>
                        <div
                          className="ch360-stack-col ch360-qr-col"
                          style={{ display: "inline-block", verticalAlign: "top", width: 240, maxWidth: 240, marginLeft: 20 }}
                        >
                          <table
                            role="presentation"
                            width="100%"
                            cellPadding={0}
                            cellSpacing={0}
                            style={{
                              backgroundColor: IVORY_LIGHT,
                              border: `1px solid ${BORDER}`,
                              borderRadius: 16,
                            }}
                          >
                            <tbody>
                              <tr>
                                <td align="center" style={{ padding: "24px 20px" }}>
                                  <Img src={CALENDAR_ICON_URL} width={44} height={30} alt="" style={{ margin: "0 auto 12px", display: "block" }} />
                                  <Text style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, letterSpacing: 1, color: TEXT_SECONDARY }}>
                                    SCAN TO
                                  </Text>
                                  <Text style={{ margin: "0 0 2px", fontSize: 19, fontWeight: 700, color: TEXT, lineHeight: 1.2 }}>
                                    LEARN MORE
                                  </Text>
                                  <Text style={{ margin: "0 0 16px", fontSize: 12, fontWeight: 600, color: TEXT_SECONDARY, letterSpacing: 0.3 }}>
                                    &amp; BOOK A MEETING NOW.
                                  </Text>
                                  <Link href={QR_DESTINATION_URL} style={{ display: "inline-block" }}>
                                    <Img
                                      src={QR_IMAGE_URL}
                                      width={168}
                                      height={141}
                                      alt="QR code — scan to learn more about CreatorHub360 and book a meeting"
                                      style={{ display: "block", margin: "0 auto", borderRadius: 6 }}
                                    />
                                  </Link>
                                  <Text style={{ margin: "14px 0 0", fontSize: 14, fontStyle: "italic", color: BLACK }}>
                                    Let&rsquo;s connect!
                                  </Text>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>

                    {/* 3. Checklist card — icon-clipping fix: the checkmark is a CSS table-cell
                        badge (identical proven pattern to the numbered step badges below, which
                        never clipped), not an image, so there's no crop/positioning surface for
                        clipping to happen on at all. The icon cell also carries both an HTML
                        width attribute and a CSS width (some clients, notably Outlook's Word
                        engine, trust the attribute over inline CSS for table layout), plus
                        explicit horizontal padding on both the icon and text cells so neither
                        ever sits flush against a table edge. */}
                    <tr>
                      <td style={{ padding: "20px 40px 8px" }}>
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ backgroundColor: IVORY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 16 }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: "28px 32px" }}>
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ marginBottom: 20 }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ verticalAlign: "middle", paddingLeft: 0, paddingRight: 16, width: 48 }} width={48}>
                                        <Img src={CLIPBOARD_ICON_URL} width={40} height={40} alt="" style={{ display: "block" }} />
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <Text style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT, lineHeight: 1.3 }}>
                                          BEFORE YOU COME,
                                          <br />
                                          WHAT YOU NEED TO DO
                                        </Text>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>

                                <ChecklistRow>
                                  Sign up on Partiful &ndash;{" "}
                                  <Link href={PARTIFUL_URL} style={{ color: BLACK, textDecoration: "underline" }}>
                                    {PARTIFUL_URL}
                                  </Link>
                                </ChecklistRow>
                                <ChecklistRow>Apply to be a creator</ChecklistRow>
                                <ChecklistRow last>Be ready to create and grow!</ChecklistRow>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* 4. How to apply — single authoritative composite image (all three
                        numbered steps/screenshots/arrows baked in by the supplied source),
                        used as-is rather than three separately cropped/recreated screenshots. */}
                    <tr>
                      <td style={{ padding: "32px 40px 8px" }} align="center">
                        <Text
                          style={{
                            margin: "0 0 22px",
                            fontSize: 13,
                            fontWeight: 700,
                            letterSpacing: 1,
                            color: TEXT,
                            textAlign: "center",
                          }}
                        >
                          HOW TO APPLY (TIKTOK SHOP FOR CREATOR)
                        </Text>
                        <Img
                          src={TIKTOK_GUIDE_IMAGE_URL}
                          alt="Step 1: Open your TikTok app and tap on TikTok Studio. Step 2: Tap on TikTok Shop for Creator. Step 3: Tap on the Apply button."
                          width={620}
                          height={489}
                          className="ch360-hero-img"
                          style={{ display: "block", margin: "0 auto", width: "100%", maxWidth: 620, height: "auto" }}
                        />
                      </td>
                    </tr>

                    {/* 5. Closing card */}
                    <tr>
                      <td style={{ padding: "32px 40px 8px" }}>
                        <table
                          role="presentation"
                          width="100%"
                          cellPadding={0}
                          cellSpacing={0}
                          style={{ backgroundColor: IVORY_LIGHT, border: `1px solid ${BORDER}`, borderRadius: 16 }}
                        >
                          <tbody>
                            <tr>
                              <td style={{ padding: "24px 28px" }}>
                                <table role="presentation" cellPadding={0} cellSpacing={0}>
                                  <tbody>
                                    <tr>
                                      <td style={{ verticalAlign: "middle", paddingRight: 16, width: 48 }} width={48}>
                                        <Img src={COMMUNITY_ICON_URL} width={40} height={38} alt="" style={{ display: "block" }} />
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <Text style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: TEXT }}>
                                          We can&rsquo;t wait to see you at the{" "}
                                          <strong style={{ color: BLACK }}>CreatorHUB Academy Kick Off &mdash; Matcha &amp; Coffee</strong>!
                                          <br />
                                          Let&rsquo;s connect, collaborate, and grow together.
                                        </Text>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* 6. Footer — black background, white typography/icons */}
                    <tr>
                      <td style={{ backgroundColor: BLACK_SECONDARY, padding: "24px 40px", marginTop: 32 }} align="center">
                        <table role="presentation" cellPadding={0} cellSpacing={0}>
                          <tbody>
                            <tr>
                              <td style={{ verticalAlign: "middle", paddingRight: 12 }}>
                                <Link href={INSTAGRAM_PROFILE_URL} style={{ display: "inline-block" }}>
                                  <Img src={INSTAGRAM_ICON_URL} width={18} height={18} alt="Instagram" style={{ display: "block" }} />
                                </Link>
                              </td>
                              <td style={{ verticalAlign: "middle", paddingRight: 12 }}>
                                <Link href={TIKTOK_PROFILE_URL} style={{ display: "inline-block" }}>
                                  <Img src={TIKTOK_ICON_URL} width={18} height={17} alt="TikTok" style={{ display: "block" }} />
                                </Link>
                              </td>
                              <td style={{ verticalAlign: "middle", paddingRight: 12, color: "#5a5a5a", fontSize: 13 }}>|</td>
                              <td style={{ verticalAlign: "middle", paddingRight: 12 }}>
                                <Text style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, color: WHITE }}>
                                  CREATORHUB360
                                </Text>
                              </td>
                              <td style={{ verticalAlign: "middle", paddingRight: 12, color: "#5a5a5a", fontSize: 13 }}>|</td>
                              <td style={{ verticalAlign: "middle" }}>
                                <Text style={{ margin: 0, fontSize: 11, letterSpacing: 0.6, color: "#cfcfcf" }}>
                                  CONNECT. COLLABORATE. GROW.
                                </Text>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

/**
 * The checkmark is a CSS table-cell badge — the exact same proven pattern as
 * StepColumn's numbered circle (never reported as clipped) — not an <img>.
 * That removes the entire class of "icon image crop/positioning" bugs the
 * clipping report pointed at: there's no image to crop incorrectly, no
 * intrinsic-size mismatch, nothing that can be clipped by a container that's
 * narrower than expected.
 *
 * The actual root cause, confirmed by rendering this row and measuring it:
 * the "Sign up on Partiful – <long unbroken URL>" row's icon column
 * rendered at ~9px instead of 22px. table-layout:auto (the default) sizes
 * columns from their content, and a long URL has no spaces to wrap at — the
 * browser shrank the *icon* column trying to make room for the
 * unbreakable text run in the *other* column, even though both an HTML
 * width attribute and inline CSS width said 34/22px. Two independent fixes
 * close this: table-layout:fixed forces the table to honor the first row's
 * column widths rather than re-deriving them from content, and
 * overflowWrap:"anywhere" on the text cell lets a long URL actually break
 * instead of forcing the table to compress something else to fit it. Either
 * alone might be enough; both together is the robust, defensive fix — this
 * is likely the real explanation for the original clipping report too, not
 * a bad icon crop.
 */
function ChecklistRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ marginBottom: last ? 0 : 14, tableLayout: "fixed" }}
    >
      <tbody>
        <tr>
          <td width={34} style={{ verticalAlign: "top", width: 34, paddingTop: 1, paddingRight: 2 }}>
            <table role="presentation" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td
                    align="center"
                    width={22}
                    height={22}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: BLACK,
                      color: WHITE,
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: "22px",
                      textAlign: "center",
                    }}
                  >
                    &#10003;
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
          <td
            style={{
              verticalAlign: "top",
              fontSize: 14,
              lineHeight: 1.7,
              color: TEXT,
              paddingLeft: 10,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {children}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

