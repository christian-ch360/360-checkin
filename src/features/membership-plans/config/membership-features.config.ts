import type { MembershipFeatureValueType, MembershipFeatureResetPeriod } from "@prisma/client";

/**
 * Bootstrap-only seed data — read exclusively by ensureDefaultMembershipFeatures/
 * ensureDefaultCreatorPackages (see membership-features.service.ts) the first
 * time an org has no features/packages configured yet. Nothing else in the
 * app imports this file: access-control code (bookSpace, event RSVP, usage
 * counters) reads MembershipFeature/MembershipPlanFeatureValue rows from the
 * database by `key`, never from here, so a Super Admin's edits after seeding
 * are the real source of truth — this module only exists so a fresh
 * environment isn't a blank slate.
 */

export type FeatureSeed = {
  key: string;
  label: string;
  description: string;
  valueType: MembershipFeatureValueType;
  resetPeriod: MembershipFeatureResetPeriod;
  sortOrder: number;
};

export const DEFAULT_MEMBERSHIP_FEATURES: FeatureSeed[] = [
  { key: "building_access_level", label: "Building Access Level", description: "Which parts of the facility this package unlocks.", valueType: "TEXT", resetPeriod: "NONE", sortOrder: 0 },
  { key: "lounge_access", label: "Business Lounge Access", description: "Access to the business lounge.", valueType: "BOOLEAN", resetPeriod: "NONE", sortOrder: 10 },
  { key: "parking_included", label: "Parking Pass", description: "Complimentary parking.", valueType: "BOOLEAN", resetPeriod: "NONE", sortOrder: 20 },
  { key: "food_drinks_included", label: "Food & Drinks Bar Access", description: "Complimentary food & drinks bar.", valueType: "BOOLEAN", resetPeriod: "NONE", sortOrder: 30 },
  { key: "board_room_access", label: "Executive Board Room Access", description: "Ability to reserve the executive board room.", valueType: "BOOLEAN", resetPeriod: "NONE", sortOrder: 40 },
  { key: "podcast_room_access", label: "Podcast Room Access", description: "Ability to reserve the podcast room.", valueType: "BOOLEAN", resetPeriod: "NONE", sortOrder: 50 },
  { key: "guest_passes_per_day", label: "Guest Passes Per Day", description: "How many guests a member may bring per day.", valueType: "NUMBER", resetPeriod: "DAILY", sortOrder: 60 },
  { key: "networking_event_credits", label: "Monthly Networking Event Credits", description: "Complimentary Industry Mixer RSVPs included per month.", valueType: "NUMBER", resetPeriod: "MONTHLY", sortOrder: 70 },
  { key: "brand_event_credits", label: "Brand Event Credits", description: "Brand events a member may co-host per month.", valueType: "NUMBER", resetPeriod: "MONTHLY", sortOrder: 80 },
  { key: "priority_booking", label: "Priority Booking", description: "First access to space reservations ahead of standard members.", valueType: "BOOLEAN", resetPeriod: "NONE", sortOrder: 90 },
];

export type FeatureValueSeed = {
  key: string;
  boolValue?: boolean;
  numberValue?: number;
  textValue?: string;
  isUnlimited?: boolean;
  displayOverride?: string;
};

export type PackageSeed = {
  name: string;
  priceCents: number;
  sortOrder: number;
  description: string;
  /** Free-text bullets not tied to access control. */
  benefits: string[];
  features: FeatureValueSeed[];
};

const COMMON_BENEFITS = ["Community Access", "Creator Profile", "Project Marketplace Access", "QR Member ID"];

/** The 5 canonical CreatorHub360 packages — names and prices must never change (see AGENTS spec). */
export const DEFAULT_MEMBERSHIP_PACKAGES: PackageSeed[] = [
  {
    name: "Basic Package",
    priceCents: 9900,
    sortOrder: 0,
    description: "Get started with co-working access and the CreatorHub360 community.",
    benefits: COMMON_BENEFITS,
    features: [
      { key: "building_access_level", textValue: "Co-Working Office Access" },
      { key: "parking_included", boolValue: true },
      { key: "networking_event_credits", numberValue: 2, displayOverride: "2 complimentary Industry Mixer networking events per month" },
    ],
  },
  {
    name: "Starter Package",
    priceCents: 29900,
    sortOrder: 1,
    description: "Everything in Basic, plus lounge access and more networking credits.",
    benefits: COMMON_BENEFITS,
    features: [
      { key: "building_access_level", textValue: "Co-Working Office Access" },
      { key: "lounge_access", boolValue: true },
      { key: "parking_included", boolValue: true },
      { key: "food_drinks_included", boolValue: true, displayOverride: "Food & Drinks Bar Access" },
      { key: "networking_event_credits", numberValue: 4, displayOverride: "4 complimentary Industry Mixer networking events per month" },
      { key: "guest_passes_per_day", numberValue: 1, displayOverride: "1 Guest Pass per day" },
    ],
  },
  {
    name: "Premium Package",
    priceCents: 49900,
    sortOrder: 2,
    description: "Full lounge, board room, and podcast room access with unlimited networking.",
    benefits: [],
    features: [
      { key: "building_access_level", textValue: "Co-Working Office Access" },
      { key: "lounge_access", boolValue: true },
      { key: "parking_included", boolValue: true },
      { key: "food_drinks_included", boolValue: true, displayOverride: "Complimentary Food & Drinks Bar Access" },
      { key: "board_room_access", boolValue: true, displayOverride: "Executive Board Room Access" },
      { key: "guest_passes_per_day", numberValue: 6, displayOverride: "6 Guest Passes per day (Company Meetings)" },
      { key: "networking_event_credits", isUnlimited: true, displayOverride: "Unlimited Industry Mixer networking event access" },
      { key: "podcast_room_access", boolValue: true, displayOverride: "Podcast Room Access" },
    ],
  },
  {
    name: "Diamond Package",
    priceCents: 99900,
    sortOrder: 3,
    description: "Premium access plus unlimited podcast room time and higher guest allowance.",
    benefits: [],
    features: [
      { key: "building_access_level", textValue: "Co-Working Office Access" },
      { key: "lounge_access", boolValue: true },
      { key: "parking_included", boolValue: true },
      { key: "food_drinks_included", boolValue: true, displayOverride: "Complimentary Food & Drinks Bar Access" },
      { key: "board_room_access", boolValue: true, displayOverride: "Executive Board Room Access" },
      { key: "guest_passes_per_day", numberValue: 8, displayOverride: "8 Guest Passes per day (Company Meetings)" },
      { key: "podcast_room_access", boolValue: true, isUnlimited: true, displayOverride: "Unlimited Podcast Room Access" },
    ],
  },
  {
    name: "Gold Package",
    priceCents: 299900,
    sortOrder: 4,
    description: "The top tier — full building access and a monthly co-hosted brand event.",
    benefits: [],
    features: [
      { key: "building_access_level", textValue: "All Building Access" },
      { key: "lounge_access", boolValue: true },
      { key: "parking_included", boolValue: true },
      { key: "food_drinks_included", boolValue: true, displayOverride: "Complimentary Food & Drinks Bar Access" },
      { key: "board_room_access", boolValue: true, displayOverride: "Executive Board Room Access" },
      { key: "guest_passes_per_day", numberValue: 8, displayOverride: "8 Guest Passes per day (Company Meetings)" },
      { key: "podcast_room_access", boolValue: true, isUnlimited: true, displayOverride: "Unlimited Podcast Room Access" },
      { key: "brand_event_credits", numberValue: 1, displayOverride: "Co-host one Brand Event per month" },
    ],
  },
];
