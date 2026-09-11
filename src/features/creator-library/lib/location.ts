/**
 * Structured geography for the Creator Library (spec §7, §15). Stored as
 * separate country / state / city columns, never one blob. These helpers
 * normalize on the way in and format on the way out.
 */

const US_STATES: Record<string, string> = {
  al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California",
  co: "Colorado", ct: "Connecticut", de: "Delaware", fl: "Florida", ga: "Georgia",
  hi: "Hawaii", id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa",
  ks: "Kansas", ky: "Kentucky", la: "Louisiana", me: "Maine", md: "Maryland",
  ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi", mo: "Missouri",
  mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire", nj: "New Jersey",
  nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio",
  ok: "Oklahoma", or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina",
  sd: "South Dakota", tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont",
  va: "Virginia", wa: "Washington", wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming",
  dc: "District of Columbia",
};

const COUNTRY_ALIASES: Record<string, string> = {
  us: "United States", usa: "United States", "u.s.": "United States", "u.s.a.": "United States",
  "united states": "United States", "united states of america": "United States", america: "United States",
  uk: "United Kingdom", "u.k.": "United Kingdom", "united kingdom": "United Kingdom",
  england: "United Kingdom", "great britain": "United Kingdom",
  ca: "Canada", canada: "Canada",
};

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => (/\s|-/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export type LocationParts = { country: string | null; state: string | null; city: string | null };

export function normalizeLocation(input: LocationParts): LocationParts {
  const countryRaw = clean(input.country);
  const stateRaw = clean(input.state);
  const cityRaw = clean(input.city);

  const country = countryRaw ? (COUNTRY_ALIASES[countryRaw.toLowerCase()] ?? titleCase(countryRaw)) : null;

  let state: string | null = null;
  if (stateRaw) {
    const key = stateRaw.toLowerCase().replace(/\.$/, "");
    state = US_STATES[key] ?? (stateRaw.length <= 3 ? stateRaw.toUpperCase() : titleCase(stateRaw));
  }

  const city = cityRaw ? titleCase(cityRaw) : null;
  return { country, state, city };
}

/** "Los Angeles, California · United States" style label for display. */
export function formatLocationLabel(parts: LocationParts): string | null {
  const segments = [parts.city, parts.state, parts.country].filter(Boolean);
  return segments.length > 0 ? segments.join(", ") : null;
}

/**
 * Best-effort split of an existing free-text location ("Los Angeles, Ca, USA",
 * "Hesperia, Ca, United States", "Los Angeles, California, Usa") into parts —
 * used only to backfill the ~14 members that already have Member.location.
 * Assumes "City, State, Country" or "City, State" ordering (US-centric, which
 * matches the current data).
 */
export function deriveLocationParts(freeText: string | null | undefined): LocationParts {
  const text = clean(freeText);
  if (!text) return { country: null, state: null, city: null };

  const pieces = text.split(",").map((p) => p.trim()).filter(Boolean);
  if (pieces.length === 0) return { country: null, state: null, city: null };

  if (pieces.length === 1) return normalizeLocation({ country: null, state: null, city: pieces[0] });
  if (pieces.length === 2) return normalizeLocation({ country: null, state: pieces[1], city: pieces[0] });
  return normalizeLocation({ country: pieces[pieces.length - 1], state: pieces[1], city: pieces[0] });
}
