import { describe, it, expect } from "vitest";
import { buildDedupIndexes, classifyRow } from "@/features/creator-library/import/import-dedup";
import type { NormalizedRow } from "@/features/creator-library/import/import-validate";

function row(partial: Partial<NormalizedRow>): NormalizedRow {
  return {
    rowNumber: 1,
    name: null,
    memberIdHint: null,
    email: null,
    phone: null,
    username: null,
    profileImageUrl: null,
    instagramUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    websiteUrl: null,
    instagramHandleKey: null,
    tiktokHandleKey: null,
    instagramFollowers: null,
    tiktokFollowers: null,
    youtubeSubscribers: null,
    categories: [],
    country: null,
    state: null,
    city: null,
    bio: null,
    companyName: null,
    creatorType: null,
    ...partial,
  };
}

const indexes = buildDedupIndexes({
  members: [
    {
      id: "member-1",
      fullName: "Jordan Rivera",
      displayName: null,
      email: "jordan@example.com",
      instagramUrl: "https://instagram.com/jordanrivera",
      tiktokUrl: null,
      hasProfile: false,
    },
    {
      id: "member-2",
      fullName: "Sam Chen",
      displayName: null,
      email: null,
      instagramUrl: null,
      tiktokUrl: "https://www.tiktok.com/@samchen",
      hasProfile: true,
    },
  ],
  profiles: [
    {
      id: "profile-2",
      memberId: "member-2",
      name: "Sam Chen",
      email: null,
      instagramUrl: null,
      tiktokUrl: "https://www.tiktok.com/@samchen",
    },
    {
      id: "profile-standalone",
      memberId: null,
      name: "Alex Kim",
      email: "alex@example.com",
      instagramUrl: "https://instagram.com/alexkim",
      tiktokUrl: null,
    },
  ],
});

describe("classifyRow", () => {
  it("matches an existing member with no profile → NEW linked", () => {
    const result = classifyRow(row({ name: "Jordan Rivera", email: "jordan@example.com" }), indexes);
    expect(result.kind).toBe("NEW");
    if (result.kind === "NEW") expect(result.linkedMemberId).toBe("member-1");
  });

  it("matches an existing profile by TikTok handle → UPDATE_EXISTING", () => {
    const result = classifyRow(row({ name: "Sam Chen", tiktokHandleKey: "samchen" }), indexes);
    expect(result.kind).toBe("UPDATE_EXISTING");
    if (result.kind === "UPDATE_EXISTING") expect(result.profileId).toBe("profile-2");
  });

  it("matches a standalone profile by email → UPDATE_EXISTING", () => {
    const result = classifyRow(row({ name: "Alex Kim", email: "alex@example.com" }), indexes);
    expect(result.kind).toBe("UPDATE_EXISTING");
    if (result.kind === "UPDATE_EXISTING") expect(result.profileId).toBe("profile-standalone");
  });

  it("no signal → NEW standalone", () => {
    const result = classifyRow(row({ name: "Brand New Person", instagramHandleKey: "brandnew" }), indexes);
    expect(result.kind).toBe("NEW");
    if (result.kind === "NEW") expect(result.linkedMemberId).toBeNull();
  });

  it("name-only collision → POSSIBLE_DUPLICATE", () => {
    const result = classifyRow(row({ name: "Alex Kim" }), indexes);
    expect(result.kind).toBe("POSSIBLE_DUPLICATE");
    if (result.kind === "POSSIBLE_DUPLICATE") expect(result.candidates[0].profileId).toBe("profile-standalone");
  });

  it("conflicting strong matches → POSSIBLE_DUPLICATE", () => {
    // email points at profile-standalone, IG handle points at member-1
    const result = classifyRow(
      row({ name: "Confusing", email: "alex@example.com", instagramHandleKey: "jordanrivera" }),
      indexes,
    );
    expect(result.kind).toBe("POSSIBLE_DUPLICATE");
  });
});
