/**
 * Shared nav item list + href-building logic for the Creator Library
 * masthead — a plain module (no "use client", no component) so both the
 * server-rendered desktop nav (library-top-bar.tsx) and the client-rendered
 * mobile drawer (library-mobile-nav.tsx) can import the same function
 * directly, rather than one passing it to the other as a prop. A Server
 * Component cannot pass a function prop to a Client Component — it isn't
 * serializable across that boundary — so this has to live here, imported by
 * both sides, instead.
 */
export type LibraryNavItem = { label: string; view: string | null; href?: string };

// `view` drives the `?view=` query-param pages on /creator-library; `href`
// overrides that for items that are real, separate routes instead (the
// campaign system lives at its own /creator-library/campaigns/* routes).
export const LIBRARY_NAV_ITEMS: LibraryNavItem[] = [
  { label: "Creators", view: null },
  { label: "Locations", view: "locations" },
  { label: "Reach", view: "reach" },
  { label: "Featured", view: "featured" },
  { label: "Campaigns", view: "campaigns", href: "/creator-library/campaigns" },
];

export function libraryNavHref(item: LibraryNavItem): string {
  return item.href ?? (item.view ? `/creator-library?view=${item.view}` : "/creator-library");
}
