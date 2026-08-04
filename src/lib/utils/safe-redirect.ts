/**
 * Only a same-origin relative path is a safe post-login redirect target.
 * Rejects absolute URLs and protocol-relative ones ("//evil.com") that would
 * otherwise let a crafted ?redirectTo= bounce a signed-in user off-site.
 */
export function sanitizeRedirectPath(path: string | null | undefined): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}
