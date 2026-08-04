import { describe, it, expect } from "vitest";
import { normalizeWebsiteDomain } from "@/features/agencies/services/agency-duplicate.service";

describe("normalizeWebsiteDomain", () => {
  it("strips protocol, www, path/query/hash, and a trailing dot", () => {
    expect(normalizeWebsiteDomain("https://www.novatalent.com/contact")).toBe("novatalent.com");
    expect(normalizeWebsiteDomain("http://novatalent.com")).toBe("novatalent.com");
    expect(normalizeWebsiteDomain("novatalent.com")).toBe("novatalent.com");
    expect(normalizeWebsiteDomain("www.novatalent.com")).toBe("novatalent.com");
    expect(normalizeWebsiteDomain("novatalent.com?utm_source=x")).toBe("novatalent.com");
    expect(normalizeWebsiteDomain("novatalent.com#team")).toBe("novatalent.com");
    expect(normalizeWebsiteDomain("novatalent.com.")).toBe("novatalent.com");
  });

  it("is case-insensitive", () => {
    expect(normalizeWebsiteDomain("HTTPS://NovaTalent.COM")).toBe("novatalent.com");
  });

  it("returns null for empty/whitespace input", () => {
    expect(normalizeWebsiteDomain(null)).toBeNull();
    expect(normalizeWebsiteDomain(undefined)).toBeNull();
    expect(normalizeWebsiteDomain("")).toBeNull();
    expect(normalizeWebsiteDomain("   ")).toBeNull();
  });
});
