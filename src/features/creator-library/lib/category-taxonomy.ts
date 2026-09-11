import type { ContentCategory } from "@prisma/client";
import { CONTENT_CATEGORY_LABELS, contentCategoryValues } from "@/features/members/constants/content-categories";

/**
 * The 18 "official" CH360 primary categories (spec §6). These are a curated
 * subset of the shared ContentCategory enum — used for the CSV template, the
 * category-view emphasis, and the importer's primary-category concept. Every
 * ContentCategory value is still valid as an "additional" category; these are
 * just the headline set.
 */
export const LIBRARY_PRIMARY_CATEGORIES: ContentCategory[] = [
  "BEAUTY",
  "FITNESS",
  "FASHION",
  "LIFESTYLE",
  "FOOD",
  "TRAVEL",
  "GAMING",
  "MUSIC",
  "COMEDY",
  "TECH",
  "BUSINESS",
  "SPORTS",
  "PHOTOGRAPHY",
  "ENTERTAINMENT",
  "EDUCATION",
  "PARENTING",
  "AUTOMOTIVE",
  "HOME_DESIGN",
];

/**
 * Freeform CSV category text → ContentCategory. Covers the 18 official names,
 * common synonyms, and every existing enum label — so "Technology", "tech",
 * "TECH", "Home & Design", "home and design" all resolve to one value and the
 * importer never creates capitalization duplicates (spec §6).
 */
const CATEGORY_ALIASES: Record<string, ContentCategory> = {
  // official names
  beauty: "BEAUTY",
  fitness: "FITNESS",
  fashion: "FASHION",
  lifestyle: "LIFESTYLE",
  food: "FOOD",
  travel: "TRAVEL",
  gaming: "GAMING",
  music: "MUSIC",
  comedy: "COMEDY",
  technology: "TECH",
  tech: "TECH",
  business: "BUSINESS",
  sports: "SPORTS",
  sport: "SPORTS",
  photography: "PHOTOGRAPHY",
  photo: "PHOTOGRAPHY",
  entertainment: "ENTERTAINMENT",
  ent: "ENTERTAINMENT",
  education: "EDUCATION",
  educational: "EDUCATION",
  parenting: "PARENTING",
  family: "PARENTING",
  automotive: "AUTOMOTIVE",
  auto: "AUTOMOTIVE",
  cars: "AUTOMOTIVE",
  "home & design": "HOME_DESIGN",
  "home and design": "HOME_DESIGN",
  "home design": "HOME_DESIGN",
  "home decor": "HOME_DESIGN",
  home: "HOME_DESIGN",
  design: "HOME_DESIGN",
  interior: "HOME_DESIGN",
  // other existing enum values + synonyms
  dance: "DANCE",
  dancing: "DANCE",
  entrepreneurship: "ENTREPRENEURSHIP",
  entrepreneur: "ENTREPRENEURSHIP",
  modeling: "MODELING",
  model: "MODELING",
  pets: "PETS",
  pet: "PETS",
  animals: "PETS",
  finance: "FINANCE",
  financial: "FINANCE",
  money: "FINANCE",
  luxury: "LUXURY",
  health: "HEALTH",
  wellness: "HEALTH",
  art: "ART",
  arts: "ART",
  diy: "DIY",
  "d.i.y.": "DIY",
  crafts: "DIY",
  streaming: "STREAMING",
  streamer: "STREAMING",
  vlogs: "VLOGS",
  vlog: "VLOGS",
  vlogging: "VLOGS",
  podcasts: "PODCASTS",
  podcast: "PODCASTS",
};

// Build the label map once (lowercased "beauty" -> BEAUTY, "home & design" -> HOME_DESIGN).
const LABEL_TO_VALUE: Record<string, ContentCategory> = {};
for (const value of contentCategoryValues) {
  LABEL_TO_VALUE[CONTENT_CATEGORY_LABELS[value].toLowerCase()] = value;
  LABEL_TO_VALUE[value.toLowerCase()] = value;
}

/** One freeform category token → a ContentCategory, or null if unrecognized. */
export function normalizeCategory(raw: string | null | undefined): ContentCategory | null {
  const key = (raw ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!key) return null;
  return CATEGORY_ALIASES[key] ?? LABEL_TO_VALUE[key] ?? LABEL_TO_VALUE[key.replace(/[^a-z]/g, "")] ?? null;
}

/**
 * A cell that may hold several categories: "Beauty, Lifestyle | Fashion".
 * Returns a deduped ContentCategory[] (unrecognized tokens dropped) plus the
 * list of tokens that could not be resolved (surfaced as an import warning).
 */
export function splitCategories(raw: string | null | undefined): {
  categories: ContentCategory[];
  unresolved: string[];
} {
  const tokens = (raw ?? "")
    .split(/[,;|/]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const categories: ContentCategory[] = [];
  const unresolved: string[] = [];
  for (const token of tokens) {
    const value = normalizeCategory(token);
    if (value) {
      if (!categories.includes(value)) categories.push(value);
    } else {
      unresolved.push(token);
    }
  }
  return { categories, unresolved };
}
