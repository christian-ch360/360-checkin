// Fixture pools for the demo universe — plain data, no logic. Category-style
// fields reuse real Prisma enum values rather than inventing new strings.

export const FIRST_NAMES = [
  "Maya", "Jordan", "Ava", "Liam", "Zoe", "Ethan", "Nora", "Kai", "Isla", "Mason",
  "Layla", "Elijah", "Sofia", "Aiden", "Willow", "Lucas", "Priya", "Noah", "Ruby", "Owen",
  "Amara", "Leo", "Chloe", "Diego", "Ivy", "Marcus", "Luna", "Theo", "Sage", "Miles",
  "Nia", "Julian", "Freya", "Rowan", "Elena", "Caleb", "Talia", "Beckett", "Skye", "Xavier",
  "Harlow", "Dominic", "Wren", "Silas", "Jade", "Emmett", "Aria", "Beau", "Naomi", "Dashiell",
] as const;

export const LAST_NAMES = [
  "Rivera", "Chen", "Patel", "Nguyen", "Okafor", "Morales", "Kim", "Bennett", "Abara", "Torres",
  "Kowalski", "Ahmed", "Larsson", "Diallo", "Fitzgerald", "Sato", "Reyes", "Novak", "Osei", "Beaumont",
  "Ivanova", "Delgado", "Whitfield", "Haruki", "Callahan", "Mbeki", "Solano", "Vance", "Adeyemi", "Marchetti",
] as const;

export const CITIES = [
  "Los Angeles, CA", "New York, NY", "Austin, TX", "Miami, FL", "Nashville, TN",
  "Chicago, IL", "Atlanta, GA", "Seattle, WA", "Denver, CO", "Portland, OR",
  "San Diego, CA", "Phoenix, AZ", "Charlotte, NC", "Minneapolis, MN", "Brooklyn, NY",
] as const;

export const NICHES = [
  "Beauty & skincare", "Gaming", "Fitness & wellness", "Fashion", "Tech reviews",
  "Food & cooking", "Travel", "Personal finance", "Parenting", "Home & DIY",
  "Comedy sketches", "Music", "Sustainable living", "Pets", "Photography",
] as const;

export const SKILLS = [
  "Short-form video", "Photography", "Video editing", "Copywriting", "Livestreaming",
  "Podcasting", "Graphic design", "Brand storytelling", "SEO", "Community management",
] as const;

export const COMPANY_NAMES = [
  "Northlight Beverages", "Fernweh Travel Co.", "Solace Skincare", "Pivot Athletics",
  "Amber & Oak", "Kindred Foods", "Nomad Supply", "Lumen Wellness", "Ridgeline Outdoor",
  "Verve Beauty", "Basecamp Media", "Halcyon Home",
] as const;

export function fullName(rng: { pick<T>(items: readonly T[]): T }): { firstName: string; lastName: string; fullName: string } {
  const firstName = rng.pick(FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

export const COLLAB_POST_TITLES: Record<string, string[]> = {
  BRAND: [
    "Seeking 3 creators for Fall product launch",
    "Brand ambassador program — ongoing content",
    "Looking for UGC creators for a new skincare line",
    "Sponsored post series — 4 creators needed",
    "Product seeding + review campaign",
  ],
  CREATOR: [
    "Collab request: duet-style video series",
    "Looking for a co-host for a weekly podcast",
    "Seeking a videographer for a content day",
    "Open to brand collabs — fitness niche",
    "Photography swap — need a photographer this weekend",
  ],
};

export const PROJECT_NAME_TEMPLATES = [
  "Fall Product Launch", "Q3 Brand Ambassador Program", "Holiday Gift Guide Campaign",
  "Spring Refresh Collection", "Creator Spotlight Series", "New Store Opening Push",
  "Back to School Campaign", "Summer Travel Series", "Wellness Challenge Sponsorship",
] as const;

export const EVENT_TITLES = [
  "Creator Networking Mixer", "Content Strategy Workshop", "Monthly Meetup: Growth Tactics",
  "Brand x Creator Speed Dating", "Photography Lighting Workshop", "Podcast Launch Roundtable",
] as const;

export const SPACE_NAMES = [
  "Studio A", "Studio B", "The Loft", "Podcast Booth 1", "Podcast Booth 2",
  "Edit Bay 1", "Edit Bay 2", "Beauty Station", "The Green Room", "Conference Room North",
] as const;
