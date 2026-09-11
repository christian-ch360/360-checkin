import { describe, it, expect } from "vitest";
import {
  handleMatchKey,
  normalizeHandle,
  normalizeName,
  normalizeWebsiteUrl,
  parseFollowerCount,
} from "@/features/creator-library/lib/normalize";
import { normalizeCategory, splitCategories } from "@/features/creator-library/lib/category-taxonomy";
import { resolveReachTier, REACH_TIERS } from "@/features/creator-library/lib/reach";
import { deriveLocationParts, normalizeLocation } from "@/features/creator-library/lib/location";

describe("parseFollowerCount", () => {
  it("parses plain, comma, K and M formats", () => {
    expect(parseFollowerCount("1200000")).toBe(1_200_000);
    expect(parseFollowerCount("1,200,000")).toBe(1_200_000);
    expect(parseFollowerCount("100K")).toBe(100_000);
    expect(parseFollowerCount("1.2M")).toBe(1_200_000);
    expect(parseFollowerCount("1.2 m")).toBe(1_200_000);
    expect(parseFollowerCount("48.5k followers")).toBe(48_500);
    expect(parseFollowerCount(93_900)).toBe(93_900);
  });

  it("returns null for blank / junk / scraping artifacts", () => {
    expect(parseFollowerCount("")).toBeNull();
    expect(parseFollowerCount("—")).toBeNull();
    expect(parseFollowerCount("n/a")).toBeNull();
    expect(parseFollowerCount("0")).toBeNull();
    expect(parseFollowerCount("1")).toBeNull();
    expect(parseFollowerCount("lots")).toBeNull();
    expect(parseFollowerCount(1)).toBeNull();
    expect(parseFollowerCount(-5)).toBeNull();
  });
});

describe("normalizeHandle / handleMatchKey", () => {
  it("strips @ and URL wrappers", () => {
    expect(normalizeHandle("@jordanrivera")).toBe("jordanrivera");
    expect(normalizeHandle("jordanrivera")).toBe("jordanrivera");
    expect(normalizeHandle("https://instagram.com/jordanrivera")).toBe("jordanrivera");
    expect(normalizeHandle("https://www.tiktok.com/@jordanrivera?lang=en")).toBe("jordanrivera");
  });
  it("treats no-account markers as null", () => {
    expect(normalizeHandle("No Instagram Account")).toBeNull();
    expect(normalizeHandle("N/A")).toBeNull();
    expect(normalizeHandle("")).toBeNull();
  });
  it("match key ignores punctuation and case", () => {
    expect(handleMatchKey("@_bblasian")).toBe("bblasian");
    expect(handleMatchKey("B_Blasian")).toBe("bblasian");
    expect(handleMatchKey("https://instagram.com/b.blasian")).toBe("bblasian");
  });
});

describe("normalizeName / normalizeWebsiteUrl", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeName("  Jordan   Rivera ")).toBe("Jordan Rivera");
    expect(normalizeName("")).toBeNull();
  });
  it("adds protocol and rejects non-URLs", () => {
    expect(normalizeWebsiteUrl("jordanrivera.com")).toBe("https://jordanrivera.com");
    expect(normalizeWebsiteUrl("https://jordanrivera.com/")).toBe("https://jordanrivera.com");
    expect(normalizeWebsiteUrl("not a url")).toBeNull();
    expect(normalizeWebsiteUrl("")).toBeNull();
  });
});

describe("category taxonomy", () => {
  it("normalizes synonyms and casing to one value", () => {
    expect(normalizeCategory("Technology")).toBe("TECH");
    expect(normalizeCategory("tech")).toBe("TECH");
    expect(normalizeCategory("TECH")).toBe("TECH");
    expect(normalizeCategory("Home & Design")).toBe("HOME_DESIGN");
    expect(normalizeCategory("home and design")).toBe("HOME_DESIGN");
    expect(normalizeCategory("Beauty")).toBe("BEAUTY");
    expect(normalizeCategory("Entertainment")).toBe("ENTERTAINMENT");
    expect(normalizeCategory("nonsense")).toBeNull();
  });
  it("splits a multi-category cell and reports unresolved tokens", () => {
    const { categories, unresolved } = splitCategories("Beauty, Lifestyle | Fashion; blah");
    expect(categories).toEqual(["BEAUTY", "LIFESTYLE", "FASHION"]);
    expect(unresolved).toEqual(["blah"]);
  });
});

describe("reach tiers", () => {
  it("maps totals to the right tier", () => {
    expect(resolveReachTier(500)).toBeNull();
    expect(resolveReachTier(5_000)?.key).toBe("emerging");
    expect(resolveReachTier(25_000)?.key).toBe("rising");
    expect(resolveReachTier(75_000)?.key).toBe("established");
    expect(resolveReachTier(250_000)?.key).toBe("influential");
    expect(resolveReachTier(750_000)?.key).toBe("major");
    expect(resolveReachTier(17_400_000)?.key).toBe("elite");
  });
  it("tier boundaries are contiguous", () => {
    for (let i = 1; i < REACH_TIERS.length; i += 1) {
      expect(REACH_TIERS[i].min).toBe(REACH_TIERS[i - 1].max);
    }
  });
});

describe("location parsing", () => {
  it("derives parts from free text and normalizes abbreviations", () => {
    expect(deriveLocationParts("Los Angeles, Ca, USA")).toEqual({
      country: "United States",
      state: "California",
      city: "Los Angeles",
    });
    expect(deriveLocationParts("Hesperia, Ca, United States")).toEqual({
      country: "United States",
      state: "California",
      city: "Hesperia",
    });
    expect(deriveLocationParts("New York City")).toEqual({ country: null, state: null, city: "New York City" });
  });
  it("normalizeLocation title-cases and expands", () => {
    expect(normalizeLocation({ country: "usa", state: "ny", city: "new york city" })).toEqual({
      country: "United States",
      state: "New York",
      city: "New York City",
    });
  });
});
