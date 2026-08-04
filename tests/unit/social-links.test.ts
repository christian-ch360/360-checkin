import { describe, it, expect } from "vitest";
import { instagramUrl, tiktokUrl, youtubeUrl, linkedinUrl } from "@/lib/utils/social-links";

describe("social-links utils", () => {
  it("normalizes every documented Instagram input format to the same URL", () => {
    expect(instagramUrl("username")).toBe("https://instagram.com/username");
    expect(instagramUrl("@username")).toBe("https://instagram.com/username");
    expect(instagramUrl("instagram.com/username")).toBe("https://instagram.com/username");
    expect(instagramUrl("https://instagram.com/username")).toBe("https://instagram.com/username");
  });

  it("normalizes every documented TikTok input format to the same URL", () => {
    expect(tiktokUrl("username")).toBe("https://www.tiktok.com/@username");
    expect(tiktokUrl("@username")).toBe("https://www.tiktok.com/@username");
    expect(tiktokUrl("tiktok.com/@username")).toBe("https://www.tiktok.com/@username");
    expect(tiktokUrl("https://www.tiktok.com/@username")).toBe("https://www.tiktok.com/@username");
  });

  it("strips trailing slashes and query strings", () => {
    expect(instagramUrl("instagram.com/username/")).toBe("https://instagram.com/username");
    expect(tiktokUrl("https://www.tiktok.com/@username?lang=en")).toBe("https://www.tiktok.com/@username");
  });

  it("returns null for empty or invalid input", () => {
    expect(instagramUrl("")).toBeNull();
    expect(instagramUrl(null)).toBeNull();
    expect(instagramUrl(undefined)).toBeNull();
    expect(instagramUrl("not a valid handle!!")).toBeNull();
    expect(tiktokUrl("   ")).toBeNull();
  });

  it("only accepts a URL for YouTube, never a bare handle", () => {
    expect(youtubeUrl("somechannel")).toBeNull();
    expect(youtubeUrl("youtube.com/@somechannel")).toBe("https://youtube.com/@somechannel");
    expect(youtubeUrl("https://www.youtube.com/@somechannel")).toBe("https://www.youtube.com/@somechannel");
  });

  it("normalizes LinkedIn input the same way as Instagram/TikTok", () => {
    expect(linkedinUrl("username")).toBe("https://linkedin.com/in/username");
    expect(linkedinUrl("linkedin.com/in/username")).toBe("https://linkedin.com/in/username");
    expect(linkedinUrl("https://www.linkedin.com/in/username")).toBe("https://linkedin.com/in/username");
  });
});
