import type { ContentCategory } from "@prisma/client";
import {
  handleMatchKey,
  instagramUrlFromInput,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeWebsiteUrl,
  parseFollowerCount,
  tiktokUrlFromInput,
  youtubeUrlFromInput,
} from "@/features/creator-library/lib/normalize";
import { normalizeLocation } from "@/features/creator-library/lib/location";
import { normalizeCategory, splitCategories } from "@/features/creator-library/lib/category-taxonomy";
import type { MappedRow } from "@/features/creator-library/import/import-schema";

/** A row after normalization — the exact shape that would be written. */
export type NormalizedRow = {
  rowNumber: number;
  name: string | null;
  memberIdHint: string | null;
  email: string | null;
  phone: string | null;
  username: string | null;
  profileImageUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  instagramHandleKey: string | null;
  tiktokHandleKey: string | null;
  instagramFollowers: number | null;
  tiktokFollowers: number | null;
  youtubeSubscribers: number | null;
  categories: ContentCategory[];
  country: string | null;
  state: string | null;
  city: string | null;
  bio: string | null;
  companyName: string | null;
  creatorType: string | null;
};

export type RowValidation = {
  rowNumber: number;
  normalized: NormalizedRow;
  errors: string[];
  warnings: string[];
  isBlank: boolean;
};

function cell(row: MappedRow, field: keyof MappedRow["values"]): string | undefined {
  const value = row.values[field];
  return value != null && value.trim() ? value.trim() : undefined;
}

/** Validate + normalize one mapped row. Pure — no DB. */
export function validateRow(row: MappedRow): RowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawValues = Object.values(row.values).filter((v) => v != null && v.trim());
  const isBlank = rawValues.length === 0;

  const name = normalizeName(cell(row, "name"));

  // Follower counts: flag a value that was provided but couldn't be parsed.
  const parseCount = (field: "instagramFollowers" | "tiktokFollowers" | "youtubeSubscribers", label: string) => {
    const raw = cell(row, field);
    if (raw == null) return null;
    const parsed = parseFollowerCount(raw);
    if (parsed == null && !/^(0|1|-|—|n\/?a)$/i.test(raw)) {
      warnings.push(`${label} "${raw}" isn't a number (accepts 1200000, 1,200,000, 100K, 1.2M)`);
    }
    return parsed;
  };

  const primaryCat = normalizeCategory(cell(row, "primaryCategory"));
  if (cell(row, "primaryCategory") && !primaryCat) {
    warnings.push(`Primary category "${cell(row, "primaryCategory")}" isn't a recognized CreatorHub360 category`);
  }
  const { categories: additional, unresolved } = splitCategories(cell(row, "additionalCategories"));
  if (unresolved.length > 0) {
    warnings.push(`Unrecognized categories dropped: ${unresolved.join(", ")}`);
  }
  const categories = [...new Set([...(primaryCat ? [primaryCat] : []), ...additional])];

  const location = normalizeLocation({
    country: cell(row, "country") ?? null,
    state: cell(row, "state") ?? null,
    city: cell(row, "city") ?? null,
  });

  const instagramUrl = instagramUrlFromInput(cell(row, "instagramUrl") ?? cell(row, "instagramHandle"));
  const tiktokUrl = tiktokUrlFromInput(cell(row, "tiktokUrl") ?? cell(row, "tiktokHandle"));
  const youtubeUrl = youtubeUrlFromInput(cell(row, "youtubeUrl") ?? cell(row, "youtubeHandle"));

  const normalized: NormalizedRow = {
    rowNumber: row.rowNumber,
    name,
    memberIdHint: cell(row, "memberId") ?? null,
    email: normalizeEmail(cell(row, "email")),
    phone: normalizePhone(cell(row, "phone")),
    username: normalizeName(cell(row, "username")),
    profileImageUrl: normalizeWebsiteUrl(cell(row, "profileImageUrl")),
    instagramUrl,
    tiktokUrl,
    youtubeUrl,
    websiteUrl: normalizeWebsiteUrl(cell(row, "website")),
    instagramHandleKey: handleMatchKey(cell(row, "instagramHandle") ?? cell(row, "instagramUrl")),
    tiktokHandleKey: handleMatchKey(cell(row, "tiktokHandle") ?? cell(row, "tiktokUrl")),
    instagramFollowers: parseCount("instagramFollowers", "Instagram followers"),
    tiktokFollowers: parseCount("tiktokFollowers", "TikTok followers"),
    youtubeSubscribers: parseCount("youtubeSubscribers", "YouTube subscribers"),
    categories,
    country: location.country,
    state: location.state,
    city: location.city,
    bio: cell(row, "bio") ?? null,
    companyName: normalizeName(cell(row, "company")),
    creatorType: cell(row, "creatorType") ?? null,
  };

  if (!isBlank && !name) {
    errors.push("Missing Creator Name");
  }
  if (!isBlank && !errors.length) {
    if (normalized.categories.length === 0) warnings.push("No categories");
    if (!normalized.country && !normalized.state && !normalized.city) warnings.push("No location");
    if (!normalized.instagramUrl && !normalized.tiktokUrl && !normalized.youtubeUrl) warnings.push("No social links");
  }

  return { rowNumber: row.rowNumber, normalized, errors, warnings, isBlank };
}
