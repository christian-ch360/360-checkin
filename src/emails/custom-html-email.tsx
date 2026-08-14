import { EmailLayout } from "@/emails/layouts/email-layout";

/**
 * Wraps admin-authored (already-interpolated, already-sanitized) HTML in
 * the exact same header/footer/container/dark-mode shell every one of the
 * 51 code-defined templates uses — reusing EmailLayout directly rather than
 * approximating it, so an override or custom template looks and behaves
 * like every other CreatorHub360 email. `bodyHtml` must already be
 * sanitized (see template-html-sanitize.ts) before it reaches here: this
 * component's only job is the layout shell, not safety.
 */
export function CustomHtmlEmail({ preview, bodyHtml }: { preview: string; bodyHtml: string }) {
  return (
    <EmailLayout preview={preview}>
      {/* bodyHtml is sanitized (allowlisted tags/attrs only) before this
          component ever renders it, both on save and again defensively
          here at render time — see sanitizeEmailHtml. */}
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </EmailLayout>
  );
}
