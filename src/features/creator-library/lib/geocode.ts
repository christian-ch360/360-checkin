/**
 * Deterministic city/state/country → coordinates lookup for the Locations
 * map. No network geocoding call per render (spec requirement) — everything
 * here is a static, hand-maintained table of well-known real-world
 * coordinates. A location with no city/state match still resolves via its
 * country centroid, so every real creator location places *somewhere*
 * sensible on the map even if not pinpoint-accurate.
 */

export type LatLng = { lat: number; lng: number };

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

// Real approximate country centroids — enough to place a marker sensibly
// even without state/city detail. Not exhaustive; unmapped countries simply
// don't render a marker (never guessed).
const COUNTRY_COORDS: Record<string, LatLng> = {
  "united states": { lat: 39.8, lng: -98.6 },
  usa: { lat: 39.8, lng: -98.6 },
  "united states of america": { lat: 39.8, lng: -98.6 },
  canada: { lat: 56.1, lng: -106.3 },
  mexico: { lat: 23.6, lng: -102.5 },
  "united kingdom": { lat: 54.0, lng: -2.9 },
  uk: { lat: 54.0, lng: -2.9 },
  ireland: { lat: 53.4, lng: -8.2 },
  france: { lat: 46.6, lng: 2.2 },
  germany: { lat: 51.2, lng: 10.5 },
  spain: { lat: 40.5, lng: -3.7 },
  italy: { lat: 42.8, lng: 12.6 },
  portugal: { lat: 39.4, lng: -8.2 },
  netherlands: { lat: 52.1, lng: 5.3 },
  belgium: { lat: 50.5, lng: 4.5 },
  switzerland: { lat: 46.8, lng: 8.2 },
  sweden: { lat: 60.1, lng: 18.6 },
  norway: { lat: 60.5, lng: 8.5 },
  denmark: { lat: 56.3, lng: 9.5 },
  poland: { lat: 51.9, lng: 19.1 },
  austria: { lat: 47.5, lng: 14.6 },
  greece: { lat: 39.1, lng: 21.8 },
  turkey: { lat: 38.9, lng: 35.2 },
  "united arab emirates": { lat: 23.4, lng: 53.8 },
  uae: { lat: 23.4, lng: 53.8 },
  "saudi arabia": { lat: 23.9, lng: 45.1 },
  israel: { lat: 31.0, lng: 34.9 },
  india: { lat: 20.6, lng: 79.0 },
  pakistan: { lat: 30.4, lng: 69.3 },
  china: { lat: 35.9, lng: 104.2 },
  japan: { lat: 36.2, lng: 138.3 },
  "south korea": { lat: 35.9, lng: 127.8 },
  singapore: { lat: 1.35, lng: 103.8 },
  malaysia: { lat: 4.2, lng: 101.9 },
  indonesia: { lat: -0.8, lng: 113.9 },
  philippines: { lat: 12.9, lng: 121.8 },
  thailand: { lat: 15.9, lng: 100.99 },
  vietnam: { lat: 14.1, lng: 108.3 },
  australia: { lat: -25.3, lng: 133.8 },
  "new zealand": { lat: -41.0, lng: 174.9 },
  brazil: { lat: -14.2, lng: -51.9 },
  argentina: { lat: -38.4, lng: -63.6 },
  chile: { lat: -35.7, lng: -71.5 },
  colombia: { lat: 4.6, lng: -74.3 },
  peru: { lat: -9.2, lng: -75.0 },
  "south africa": { lat: -30.6, lng: 22.9 },
  nigeria: { lat: 9.1, lng: 8.7 },
  egypt: { lat: 26.8, lng: 30.8 },
  kenya: { lat: -0.02, lng: 37.9 },
  morocco: { lat: 31.8, lng: -7.1 },
  russia: { lat: 61.5, lng: 105.3 },
};

// US state centroids (approximate).
const US_STATE_COORDS: Record<string, LatLng> = {
  alabama: { lat: 32.8, lng: -86.8 },
  alaska: { lat: 64.2, lng: -149.5 },
  arizona: { lat: 34.0, lng: -111.6 },
  arkansas: { lat: 34.8, lng: -92.2 },
  california: { lat: 36.8, lng: -119.4 },
  colorado: { lat: 39.0, lng: -105.5 },
  connecticut: { lat: 41.6, lng: -72.7 },
  delaware: { lat: 39.0, lng: -75.5 },
  "district of columbia": { lat: 38.9, lng: -77.0 },
  florida: { lat: 27.7, lng: -81.5 },
  georgia: { lat: 32.9, lng: -83.4 },
  hawaii: { lat: 20.8, lng: -156.3 },
  idaho: { lat: 44.2, lng: -114.5 },
  illinois: { lat: 40.3, lng: -89.0 },
  indiana: { lat: 39.9, lng: -86.3 },
  iowa: { lat: 42.0, lng: -93.5 },
  kansas: { lat: 38.5, lng: -98.0 },
  kentucky: { lat: 37.7, lng: -84.9 },
  louisiana: { lat: 31.2, lng: -92.0 },
  maine: { lat: 45.4, lng: -69.2 },
  maryland: { lat: 39.0, lng: -76.7 },
  massachusetts: { lat: 42.4, lng: -71.4 },
  michigan: { lat: 44.3, lng: -85.6 },
  minnesota: { lat: 46.4, lng: -94.6 },
  mississippi: { lat: 32.7, lng: -89.7 },
  missouri: { lat: 38.6, lng: -92.5 },
  montana: { lat: 47.0, lng: -109.6 },
  nebraska: { lat: 41.5, lng: -99.8 },
  nevada: { lat: 39.3, lng: -116.6 },
  "new hampshire": { lat: 43.7, lng: -71.6 },
  "new jersey": { lat: 40.1, lng: -74.7 },
  "new mexico": { lat: 34.5, lng: -106.0 },
  "new york": { lat: 43.0, lng: -75.5 },
  "north carolina": { lat: 35.6, lng: -79.8 },
  "north dakota": { lat: 47.5, lng: -99.8 },
  ohio: { lat: 40.4, lng: -82.9 },
  oklahoma: { lat: 35.6, lng: -97.5 },
  oregon: { lat: 44.0, lng: -120.6 },
  pennsylvania: { lat: 41.2, lng: -77.2 },
  "rhode island": { lat: 41.7, lng: -71.5 },
  "south carolina": { lat: 33.9, lng: -80.9 },
  "south dakota": { lat: 44.3, lng: -100.3 },
  tennessee: { lat: 35.9, lng: -86.4 },
  texas: { lat: 31.4, lng: -99.3 },
  utah: { lat: 39.3, lng: -111.7 },
  vermont: { lat: 44.0, lng: -72.7 },
  virginia: { lat: 37.5, lng: -78.7 },
  washington: { lat: 47.4, lng: -120.5 },
  "west virginia": { lat: 38.6, lng: -80.6 },
  wisconsin: { lat: 44.6, lng: -89.9 },
  wyoming: { lat: 43.0, lng: -107.5 },
};

// Real, well-known city coordinates. Keyed as "city, state" for US cities
// (disambiguates e.g. "Portland, OR" vs "Portland, ME") and "city, country"
// for international cities.
const CITY_COORDS: Record<string, LatLng> = {
  "los angeles, california": { lat: 34.05, lng: -118.24 },
  "san francisco, california": { lat: 37.77, lng: -122.42 },
  "san diego, california": { lat: 32.72, lng: -117.16 },
  "sacramento, california": { lat: 38.58, lng: -121.49 },
  "oakland, california": { lat: 37.8, lng: -122.27 },
  "san jose, california": { lat: 37.34, lng: -121.89 },
  "long beach, california": { lat: 33.77, lng: -118.19 },
  "new york, new york": { lat: 40.71, lng: -74.0 },
  "brooklyn, new york": { lat: 40.68, lng: -73.94 },
  "chicago, illinois": { lat: 41.88, lng: -87.63 },
  "houston, texas": { lat: 29.76, lng: -95.37 },
  "austin, texas": { lat: 30.27, lng: -97.74 },
  "dallas, texas": { lat: 32.78, lng: -96.8 },
  "san antonio, texas": { lat: 29.42, lng: -98.49 },
  "phoenix, arizona": { lat: 33.45, lng: -112.07 },
  "philadelphia, pennsylvania": { lat: 39.95, lng: -75.17 },
  "san antonio, florida": { lat: 28.53, lng: -82.29 },
  "miami, florida": { lat: 25.76, lng: -80.19 },
  "orlando, florida": { lat: 28.54, lng: -81.38 },
  "tampa, florida": { lat: 27.95, lng: -82.46 },
  "atlanta, georgia": { lat: 33.75, lng: -84.39 },
  "boston, massachusetts": { lat: 42.36, lng: -71.06 },
  "seattle, washington": { lat: 47.61, lng: -122.33 },
  "denver, colorado": { lat: 39.74, lng: -104.99 },
  "las vegas, nevada": { lat: 36.17, lng: -115.14 },
  "portland, oregon": { lat: 45.52, lng: -122.68 },
  "nashville, tennessee": { lat: 36.16, lng: -86.78 },
  "detroit, michigan": { lat: 42.33, lng: -83.05 },
  "minneapolis, minnesota": { lat: 44.98, lng: -93.27 },
  "washington, district of columbia": { lat: 38.91, lng: -77.04 },
  "charlotte, north carolina": { lat: 35.23, lng: -80.84 },
  "columbus, ohio": { lat: 39.96, lng: -83.0 },
  "new orleans, louisiana": { lat: 29.95, lng: -90.07 },
  "salt lake city, utah": { lat: 40.76, lng: -111.89 },
  // International.
  "london, united kingdom": { lat: 51.51, lng: -0.13 },
  "paris, france": { lat: 48.86, lng: 2.35 },
  "berlin, germany": { lat: 52.52, lng: 13.4 },
  "madrid, spain": { lat: 40.42, lng: -3.7 },
  "barcelona, spain": { lat: 41.39, lng: 2.17 },
  "rome, italy": { lat: 41.9, lng: 12.5 },
  "milan, italy": { lat: 45.46, lng: 9.19 },
  "amsterdam, netherlands": { lat: 52.37, lng: 4.9 },
  "lisbon, portugal": { lat: 38.72, lng: -9.14 },
  "dublin, ireland": { lat: 53.35, lng: -6.26 },
  "toronto, canada": { lat: 43.65, lng: -79.38 },
  "vancouver, canada": { lat: 49.28, lng: -123.12 },
  "montreal, canada": { lat: 45.5, lng: -73.57 },
  "mexico city, mexico": { lat: 19.43, lng: -99.13 },
  "sao paulo, brazil": { lat: -23.55, lng: -46.63 },
  "rio de janeiro, brazil": { lat: -22.91, lng: -43.17 },
  "buenos aires, argentina": { lat: -34.6, lng: -58.38 },
  "bogota, colombia": { lat: 4.71, lng: -74.07 },
  "dubai, united arab emirates": { lat: 25.2, lng: 55.27 },
  "tel aviv, israel": { lat: 32.09, lng: 34.78 },
  "mumbai, india": { lat: 19.08, lng: 72.88 },
  "delhi, india": { lat: 28.6, lng: 77.2 },
  "bangalore, india": { lat: 12.97, lng: 77.59 },
  "tokyo, japan": { lat: 35.68, lng: 139.69 },
  "seoul, south korea": { lat: 37.57, lng: 126.98 },
  "singapore, singapore": { lat: 1.35, lng: 103.82 },
  "hong kong, china": { lat: 22.32, lng: 114.17 },
  "shanghai, china": { lat: 31.23, lng: 121.47 },
  "beijing, china": { lat: 39.9, lng: 116.4 },
  "bangkok, thailand": { lat: 13.76, lng: 100.5 },
  "manila, philippines": { lat: 14.6, lng: 120.98 },
  "jakarta, indonesia": { lat: -6.21, lng: 106.85 },
  "sydney, australia": { lat: -33.87, lng: 151.21 },
  "melbourne, australia": { lat: -37.81, lng: 144.96 },
  "auckland, new zealand": { lat: -36.85, lng: 174.76 },
  "lagos, nigeria": { lat: 6.52, lng: 3.38 },
  "nairobi, kenya": { lat: -1.29, lng: 36.82 },
  "cape town, south africa": { lat: -33.92, lng: 18.42 },
  "johannesburg, south africa": { lat: -26.2, lng: 28.05 },
};

/**
 * Resolves the best available real coordinates for a location, trying
 * city → state → country in that order. Returns null (no marker) rather
 * than guessing when nothing matches.
 */
export function resolveCoordinates(
  country: string | null,
  state: string | null,
  city: string | null,
): LatLng | null {
  const c = norm(country);
  const s = norm(state);
  const ci = norm(city);

  if (ci) {
    if (s && CITY_COORDS[`${ci}, ${s}`]) return CITY_COORDS[`${ci}, ${s}`];
    if (c && CITY_COORDS[`${ci}, ${c}`]) return CITY_COORDS[`${ci}, ${c}`];
    // A handful of international entries are keyed by country name in
    // English even when the stored country differs in casing/spelling —
    // fall through to state/country below rather than guessing further.
  }
  if (s && US_STATE_COORDS[s]) return US_STATE_COORDS[s];
  if (c && COUNTRY_COORDS[c]) return COUNTRY_COORDS[c];
  return null;
}
