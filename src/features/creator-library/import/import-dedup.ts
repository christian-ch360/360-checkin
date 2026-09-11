import { handleMatchKey, normalizeName } from "@/features/creator-library/lib/normalize";
import type { NormalizedRow } from "@/features/creator-library/import/import-validate";

/** Minimal shape of an existing Member for dedup. */
export type DedupMember = {
  id: string;
  fullName: string;
  displayName: string | null;
  email: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  hasProfile: boolean;
};

/** Minimal shape of an existing CreatorLibraryProfile for dedup. */
export type DedupProfile = {
  id: string;
  memberId: string | null;
  name: string | null; // resolved: profile.name ?? member name
  email: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
};

export type DedupIndexes = {
  members: DedupMember[];
  profiles: DedupProfile[];
};

export type RowClassification =
  | { kind: "NEW"; linkedMemberId: string | null; matchedBy: string | null }
  | { kind: "UPDATE_EXISTING"; profileId: string; linkedMemberId: string | null; matchedBy: string }
  | { kind: "POSSIBLE_DUPLICATE"; candidates: { profileId?: string; memberId?: string; name: string; reason: string }[] };

type BuiltIndexes = {
  membersById: Map<string, DedupMember>;
  membersByEmail: Map<string, DedupMember>;
  membersByIg: Map<string, DedupMember>;
  membersByTt: Map<string, DedupMember>;
  membersByName: Map<string, DedupMember[]>;
  profilesById: Map<string, DedupProfile>;
  profilesByMember: Map<string, DedupProfile>;
  profilesByEmail: Map<string, DedupProfile>;
  profilesByIg: Map<string, DedupProfile>;
  profilesByTt: Map<string, DedupProfile>;
  profilesByName: Map<string, DedupProfile[]>;
};

function pushMulti<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

export function buildDedupIndexes({ members, profiles }: DedupIndexes): BuiltIndexes {
  const idx: BuiltIndexes = {
    membersById: new Map(),
    membersByEmail: new Map(),
    membersByIg: new Map(),
    membersByTt: new Map(),
    membersByName: new Map(),
    profilesById: new Map(),
    profilesByMember: new Map(),
    profilesByEmail: new Map(),
    profilesByIg: new Map(),
    profilesByTt: new Map(),
    profilesByName: new Map(),
  };

  for (const m of members) {
    idx.membersById.set(m.id, m);
    if (m.email) idx.membersByEmail.set(m.email.toLowerCase(), m);
    const ig = handleMatchKey(m.instagramUrl);
    if (ig) idx.membersByIg.set(ig, m);
    const tt = handleMatchKey(m.tiktokUrl);
    if (tt) idx.membersByTt.set(tt, m);
    const name = normalizeName(m.displayName ?? m.fullName)?.toLowerCase();
    if (name) pushMulti(idx.membersByName, name, m);
  }

  for (const p of profiles) {
    idx.profilesById.set(p.id, p);
    if (p.memberId) idx.profilesByMember.set(p.memberId, p);
    if (p.email) idx.profilesByEmail.set(p.email.toLowerCase(), p);
    const ig = handleMatchKey(p.instagramUrl);
    if (ig) idx.profilesByIg.set(ig, p);
    const tt = handleMatchKey(p.tiktokUrl);
    if (tt) idx.profilesByTt.set(tt, p);
    const name = normalizeName(p.name)?.toLowerCase();
    if (name) pushMulti(idx.profilesByName, name, p);
  }

  return idx;
}

/**
 * Classify one normalized row against the existing data using the spec §10
 * priority: 1 member id · 2 email · 3 Instagram handle · 4 TikTok handle ·
 * 5 normalized full name. A profile match wins (UPDATE_EXISTING); otherwise a
 * member match makes it a NEW *linked* profile; a name-only hit or conflicting
 * matches → POSSIBLE_DUPLICATE (never imported silently).
 */
export function classifyRow(row: NormalizedRow, idx: BuiltIndexes): RowClassification {
  const nameKey = normalizeName(row.name)?.toLowerCase() ?? null;

  // --- strong signals: id / email / handles ---
  type Hit = { profile?: DedupProfile; member?: DedupMember; by: string };
  const strongHits: Hit[] = [];

  if (row.memberIdHint) {
    const p = idx.profilesByMember.get(row.memberIdHint);
    const m = idx.membersById.get(row.memberIdHint);
    if (p) strongHits.push({ profile: p, by: "member id" });
    else if (m) strongHits.push({ member: m, by: "member id" });
  }
  if (row.email) {
    const p = idx.profilesByEmail.get(row.email);
    const m = idx.membersByEmail.get(row.email);
    if (p) strongHits.push({ profile: p, by: "email" });
    else if (m) strongHits.push({ member: m, by: "email" });
  }
  if (row.instagramHandleKey) {
    const p = idx.profilesByIg.get(row.instagramHandleKey);
    const m = idx.membersByIg.get(row.instagramHandleKey);
    if (p) strongHits.push({ profile: p, by: "Instagram handle" });
    else if (m) strongHits.push({ member: m, by: "Instagram handle" });
  }
  if (row.tiktokHandleKey) {
    const p = idx.profilesByTt.get(row.tiktokHandleKey);
    const m = idx.membersByTt.get(row.tiktokHandleKey);
    if (p) strongHits.push({ profile: p, by: "TikTok handle" });
    else if (m) strongHits.push({ member: m, by: "TikTok handle" });
  }

  const distinctProfiles = new Map<string, Hit>();
  const distinctMembers = new Map<string, Hit>();
  for (const hit of strongHits) {
    if (hit.profile) distinctProfiles.set(hit.profile.id, hit);
    else if (hit.member) distinctMembers.set(hit.member.id, hit);
  }

  // conflicting strong matches → let Ops resolve
  if (distinctProfiles.size + distinctMembers.size > 1) {
    return {
      kind: "POSSIBLE_DUPLICATE",
      candidates: [
        ...[...distinctProfiles.values()].map((h) => ({
          profileId: h.profile!.id,
          name: h.profile!.name ?? "(unnamed profile)",
          reason: `matches by ${h.by}`,
        })),
        ...[...distinctMembers.values()].map((h) => ({
          memberId: h.member!.id,
          name: h.member!.displayName ?? h.member!.fullName,
          reason: `matches member by ${h.by}`,
        })),
      ],
    };
  }

  if (distinctProfiles.size === 1) {
    const hit = [...distinctProfiles.values()][0];
    return { kind: "UPDATE_EXISTING", profileId: hit.profile!.id, linkedMemberId: hit.profile!.memberId, matchedBy: hit.by };
  }
  if (distinctMembers.size === 1) {
    const hit = [...distinctMembers.values()][0];
    // member exists but has no library profile yet → NEW linked profile
    return { kind: "NEW", linkedMemberId: hit.member!.id, matchedBy: `member by ${hit.by}` };
  }

  // --- weak signal: normalized name only ---
  if (nameKey) {
    const profileMatches = idx.profilesByName.get(nameKey) ?? [];
    const memberMatches = idx.membersByName.get(nameKey) ?? [];
    if (profileMatches.length + memberMatches.length > 0) {
      return {
        kind: "POSSIBLE_DUPLICATE",
        candidates: [
          ...profileMatches.map((p) => ({ profileId: p.id, name: p.name ?? "(unnamed)", reason: "same name" })),
          ...memberMatches.map((m) => ({ memberId: m.id, name: m.displayName ?? m.fullName, reason: "same name (member)" })),
        ],
      };
    }
  }

  return { kind: "NEW", linkedMemberId: null, matchedBy: null };
}
