/**
 * Simple equal-weight checklist — each present field is one "point" toward
 * 100%. Deliberately coarse (no partial credit, no weighting by field
 * importance) so it's easy to reason about and cheap to keep in sync as
 * fields are added. Pure — no DB access, safe to call from a client or
 * server component.
 */
export type ProfileCompletionInput = {
  profilePhotoUrl: string | null;
  bio: string | null;
  website: string | null;
  phone: string | null;
  location: string | null;
  contentCategoriesCount: number;
  skillsCount: number;
  hasSocialLink: boolean;
  hasConnectedPlatform: boolean;
};

export function calculateProfileCompletion(input: ProfileCompletionInput): number {
  const checks = [
    Boolean(input.profilePhotoUrl),
    Boolean(input.bio),
    Boolean(input.website),
    Boolean(input.phone),
    Boolean(input.location),
    input.contentCategoriesCount > 0,
    input.skillsCount > 0,
    input.hasSocialLink,
    input.hasConnectedPlatform,
  ];

  const complete = checks.filter(Boolean).length;
  return Math.round((complete / checks.length) * 100);
}
