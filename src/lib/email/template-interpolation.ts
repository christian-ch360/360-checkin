/**
 * `{{variable}}` interpolation for admin-authored template overrides. Kept
 * dependency-free and framework-agnostic (no "server-only", no prisma) so
 * the exact same functions drive both the server-side send/preview path and
 * the editor's client-side live preview, per "use the existing... rather
 * than a separate renderer" — there is exactly one interpolation
 * implementation, not two.
 */

const VARIABLE_TOKEN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/**
 * Flattens a template's props object into a flat `{{dotted.path}}` → string
 * map for interpolation. One level of nesting is descended (e.g.
 * `stats.newApplicationsToday`) since that covers every nested prop shape
 * in the 51 templates today; Dates become locale date strings, functions/
 * React nodes/arrays are skipped (interpolation has no sensible string form
 * for them) rather than crashing.
 */
export function flattenTemplateVariables(props: unknown, prefix = ""): Record<string, string> {
  if (props === null || typeof props !== "object") return {};

  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === null || value === undefined) continue;
    if (value instanceof Date) {
      out[path] = value.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[path] = String(value);
    } else if (typeof value === "object" && !Array.isArray(value) && !prefix) {
      Object.assign(out, flattenTemplateVariables(value, path));
    }
    // Arrays, nested-nested objects, functions, React elements: skipped —
    // no safe/sensible single-string form, so they're simply not offered
    // as interpolation variables rather than producing "[object Object]".
  }

  // "firstName" is never a real prop on any template — it's derived here,
  // once, from "fullName" whenever that's present, so it's available
  // everywhere a person's name is (matching the spec's own example) without
  // ever inventing data the backend didn't actually provide.
  if (out.fullName && !out.firstName) {
    out.firstName = out.fullName.split(" ")[0];
  }

  return out;
}

/** Every `{{token}}` referenced in a string, deduplicated, in first-seen order. */
export function extractVariableTokens(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(VARIABLE_TOKEN)) seen.add(match[1]);
  return [...seen];
}

/**
 * Replaces every known `{{token}}` with its value. An unknown token is left
 * exactly as written — never blanked, never thrown — so a typo'd variable
 * degrades to a visibly-wrong-but-harmless literal string in the rendered
 * email instead of breaking the send.
 */
export function interpolateTemplate(text: string, variables: Record<string, string>): string {
  return text.replace(VARIABLE_TOKEN, (full, token: string) => (token in variables ? variables[token] : full));
}
