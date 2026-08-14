import "server-only";

import sanitizeHtml from "sanitize-html";

// Email-safe allowlist: the common HTML email tag set (tables for layout,
// inline styles since most clients strip <style> blocks/classes), no
// <script>/<iframe>/<object>/<embed>/<form>, no `on*` event handler
// attributes, no `javascript:`/`data:` hrefs. This is the one HTML entry
// point for admin-authored template content — every save and every
// preview/send goes through it, so there's nowhere for a crafted template
// to become a script-execution vector in either the admin app or the
// eventual email client.
const EMAIL_SAFE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "a", "b", "br", "blockquote", "div", "em", "h1", "h2", "h3", "h4", "h5", "h6",
    "hr", "i", "img", "li", "ol", "p", "span", "strong", "table", "tbody", "td",
    "tfoot", "th", "thead", "tr", "u", "ul",
  ],
  allowedAttributes: {
    "*": ["style", "class", "align", "width", "height"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    table: ["cellpadding", "cellspacing", "border", "role"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }, true),
  },
};

/** The single sanitization choke point for any admin-authored template HTML — called on every save and defensively again at render time. */
export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_SAFE_OPTIONS);
}

/** Plain-text fallback for a sent/previewed override — strips all markup, matching what @react-email/render's `{ plainText: true }` mode produces for the 51 code templates. */
export function htmlToPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
