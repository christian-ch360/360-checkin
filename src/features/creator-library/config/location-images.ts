/**
 * Curated, verified editorial photos for the Locations page's city/region
 * cards — real, stable Unsplash CDN URLs (Unsplash License: free to use,
 * no attribution required), each hand-picked to match its subject. Only
 * covers locations we've actually verified imagery for; anywhere else
 * falls back to a plain gradient card rather than showing a mismatched or
 * placeholder photo.
 */
export const LOCATION_IMAGES: Record<string, string> = {
  "los angeles": "https://images.unsplash.com/photo-1757386117831-d4e9bc583076?q=80&w=1200&auto=format&fit=crop",
  "san francisco": "https://images.unsplash.com/photo-1600476086547-c30b4d55afac?q=80&w=1200&auto=format&fit=crop",
  california: "https://images.unsplash.com/photo-1767681774612-a3062667f6ac?q=80&w=1200&auto=format&fit=crop",
};

export function locationImage(name: string | null | undefined): string | null {
  if (!name) return null;
  return LOCATION_IMAGES[name.trim().toLowerCase()] ?? null;
}
