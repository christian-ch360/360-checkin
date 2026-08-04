/** Joins city/state/country into one display string, skipping any that are missing. */
export function formatLocation(city: string | null, state: string | null, country: string | null): string | null {
  const parts = [city, state, country].filter((part): part is string => Boolean(part?.trim()));
  return parts.length > 0 ? parts.join(", ") : null;
}
