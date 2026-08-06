import "server-only";

import { Prisma, type RevenueChannel, type NotificationType, type EventCategory } from "@prisma/client";
import { subDays, subMonths, subHours, subMinutes, startOfDay, format } from "date-fns";
import { createRng } from "@/features/demo-data/seed/rng";
import {
  CITIES,
  NICHES,
  SKILLS,
  COMPANY_NAMES,
  COLLAB_POST_TITLES,
  PROJECT_NAME_TEMPLATES,
  EVENT_TITLES,
  SPACE_NAMES,
  fullName,
} from "@/features/demo-data/seed/fixtures";
import { CHANNEL_LABELS, NAMED_CHANNELS } from "@/features/revenue/config/revenue-channels";

// Type-only imports — erased at compile time, so this module never carries a
// runtime dependency on Prisma or any real service. Deriving demo shapes
// from the real functions' inferred return types (rather than hand-copying
// every field) guarantees the demo data structurally matches exactly.
import type { listMembers } from "@/features/members/services/members.service";
import type { listCollabPosts } from "@/features/collab-hub/services/collab-post.service";
import type { listCollabMembers } from "@/features/collab-hub/services/collab-hub.service";
import type { ConversationSummary } from "@/features/messaging/services/conversation.service";
import type { listProjects } from "@/features/projects/services/projects.service";
import type { getCachedSpacesDashboardData } from "@/features/spaces/services/spaces.service";
import type { listUpcomingEvents } from "@/features/events/services/events.service";
import type { getAdminKpis } from "@/features/dashboard/services/admin-kpis.service";
import type { getNotificationsSummary } from "@/lib/notifications";
import type { getCachedAnalyticsData } from "@/features/analytics/services/analytics.service";

export type DemoMember = Awaited<ReturnType<typeof listMembers>>["members"][number];
export type DemoCollabPost = Awaited<ReturnType<typeof listCollabPosts>>[number];
export type DemoCollabMember = Awaited<ReturnType<typeof listCollabMembers>>[number];
export type DemoProject = Awaited<ReturnType<typeof listProjects>>[number];
export type DemoSpace = Awaited<ReturnType<typeof getCachedSpacesDashboardData>>[number];
export type DemoEvent = Awaited<ReturnType<typeof listUpcomingEvents>>[number];
export type DemoAdminKpis = Awaited<ReturnType<typeof getAdminKpis>>;
export type DemoNotificationsSummary = Awaited<ReturnType<typeof getNotificationsSummary>>;
export type DemoAnalyticsBundle = Awaited<ReturnType<typeof getCachedAnalyticsData>>;

export type DemoGmvEntry = { channel: RevenueChannel; amount: number; description: string; date: Date };
export type DemoNotificationRow = {
  id: string;
  memberId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type DemoUniverse = {
  members: DemoMember[];
  creators: DemoMember[];
  brandsAndAgencies: DemoMember[];
  collabPosts: DemoCollabPost[];
  collabMembers: DemoCollabMember[];
  conversations: ConversationSummary[];
  projects: DemoProject[];
  spaces: DemoSpace[];
  events: DemoEvent[];
  notifications: DemoNotificationsSummary;
  notificationRows: DemoNotificationRow[];
  adminKpis: DemoAdminKpis;
  gmvEntries: DemoGmvEntry[];
  analytics: DemoAnalyticsBundle;
};

const SEED = 360250727; // arbitrary fixed seed — stable within a process
const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

const REVENUE_CHANNELS: RevenueChannel[] = ["BRAND_DEALS", "TIKTOK_SHOP", "ONLINE_STORE", "AFFILIATE", "UGC_PROJECTS", "REFERRALS", "OTHER"];

function buildMember(
  rng: ReturnType<typeof createRng>,
  opts: { role: "CREATOR" | "BRAND" | "AGENCY"; index: number }
): DemoMember {
  const { firstName, lastName, fullName: name } = fullName(rng);
  const id = crypto.randomUUID();
  const isCreator = opts.role === "CREATOR";
  const followerCount = isCreator ? rng.logInt(4_000, 480_000) : null;
  const lifetimeGMV = rng.float(500, 48_000, 2);
  const currentGMV = rng.float(0, lifetimeGMV, 2);
  const lifetimeCommission = Math.round(lifetimeGMV * 0.15 * 100) / 100;
  const currentCommission = Math.round(currentGMV * 0.15 * 100) / 100;
  const status = rng.bool(0.88) ? "ACTIVE" : rng.pick(["PENDING", "SUSPENDED", "INACTIVE"] as const);
  const memberSince = subDays(new Date(), rng.int(14, 900));

  return {
    id,
    organizationId: DEMO_ORG_ID,
    memberNumber: `CH360-DEMO${String(opts.index + 1).padStart(4, "0")}`,
    authUserId: null,
    fullName: name,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@demo.creatorhub360.io`,
    phone: null,
    profilePhotoUrl: null,
    website: null,
    businessRegistrationNumber: null,
    agencyCategories: [],
    agencyId: null,
    agencyRole: null,
    companyId: null,
    role: opts.role,
    systemRole: "MEMBER",
    referralSource: null,
    referralCode: null,
    referredByMemberId: null,
    referredByCode: null,
    commissionTierId: null,
    currentGMV: new Prisma.Decimal(currentGMV),
    lifetimeGMV: new Prisma.Decimal(lifetimeGMV),
    currentCommission: new Prisma.Decimal(currentCommission),
    lifetimeCommission: new Prisma.Decimal(lifetimeCommission),
    hoursWorked: new Prisma.Decimal(rng.float(0, 240, 1)),
    status,
    memberSince,
    deletedAt: null,
    approvedById: null,
    approvedAt: memberSince,
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    followerCount,
    platforms: isCreator ? rng.pickMany(["Instagram", "TikTok", "YouTube"], rng.int(1, 3)) : [],
    username: isCreator ? `${firstName.toLowerCase()}${lastName.toLowerCase()}` : null,
    displayName: isCreator ? firstName : null,
    verificationStatus: isCreator && rng.bool(0.3) ? "VERIFIED" : "UNVERIFIED",
    bannerImageUrl: null,
    location: rng.pick(CITIES),
    bio: isCreator ? `${rng.pick(NICHES)} creator based in ${rng.pick(CITIES)}. Partnering with brands that fit my audience.` : null,
    skills: isCreator ? rng.pickMany(SKILLS, rng.int(2, 4)) : [],
    contentCategories: [],
    availableForCollab: isCreator ? rng.bool(0.75) : false,
    visibleInDirectory: isCreator ? rng.bool(0.9) : true,
    lookingFor: isCreator && rng.bool(0.5) ? "Brand partnerships and paid collabs" : null,
    instagramUrl: null,
    tiktokUrl: null,
    youtubeUrl: null,
    linkedinUrl: null,
    notifyEmail: true,
    notifyCollabRequests: true,
    notifyProjectInvites: true,
    notifySpaceBookings: true,
    notifyVisitorArrivals: true,
    notifyWeeklySummary: true,
    notifyProductUpdates: false,
    notifyLikes: true,
    notifyFollows: true,
    notifyComments: true,
    notifyMentions: true,
    demoModeEnabled: false,
    createdAt: memberSince,
    updatedAt: new Date(),
    company: !isCreator ? { id: crypto.randomUUID(), name: rng.pick(COMPANY_NAMES) } : null,
    commissionTier: null,
  };
}

function buildCollabPosts(rng: ReturnType<typeof createRng>, members: DemoMember[]): DemoCollabPost[] {
  const categories = ["CREATOR", "BRAND", "AGENCY", "PHOTOGRAPHER", "VIDEOGRAPHER", "EDITOR", "MODEL", "PODCAST", "UGC"] as const;
  const budgetTypes = ["PAID", "TRADE", "FREE"] as const;
  const brandsAndAgencies = members.filter((m) => m.role === "BRAND" || m.role === "AGENCY");
  const creators = members.filter((m) => m.role === "CREATOR");

  return Array.from({ length: 42 }, (_, i) => {
    const isBrandPost = rng.bool(0.4) && brandsAndAgencies.length > 0;
    const author = isBrandPost ? rng.pick(brandsAndAgencies) : rng.pick(creators);
    const titlePool = isBrandPost ? COLLAB_POST_TITLES.BRAND : COLLAB_POST_TITLES.CREATOR;
    const createdAt = subDays(new Date(), rng.int(0, 45));

    return {
      id: crypto.randomUUID(),
      organizationId: DEMO_ORG_ID,
      memberId: author.id,
      title: rng.pick(titlePool),
      description: isBrandPost
        ? `We're looking for creators in the ${rng.pick(NICHES).toLowerCase()} space for an upcoming campaign. Deliverables include short-form video and static posts.`
        : `Open to collaborating with other creators — ${rng.pick(NICHES).toLowerCase()} niche. Let's create something together.`,
      category: isBrandPost ? rng.pick(["BRAND", "AGENCY"] as const) : rng.pick(categories),
      budgetType: rng.pick(budgetTypes),
      budgetNote: rng.bool(0.6) ? `$${rng.int(1, 20) * 100}–$${rng.int(20, 50) * 100}` : null,
      dateNeeded: rng.bool(0.5) ? subDays(new Date(), -rng.int(3, 30)) : null,
      location: rng.pick(["ON_SITE", "REMOTE"] as const),
      expiresAt: subDays(new Date(), -rng.int(7, 60)),
      status: rng.bool(0.75) ? "OPEN" : rng.pick(["CLOSED", "FILLED"] as const),
      imageUrls: [],
      videoUrls: [],
      createdAt,
      updatedAt: createdAt,
      member: {
        id: author.id,
        fullName: author.fullName,
        profilePhotoUrl: author.profilePhotoUrl,
        role: author.role,
        company: author.company ? { name: author.company.name } : null,
      },
      _count: { applications: rng.int(0, 14), likes: rng.int(0, 30) },
      hasApplied: i % 5 === 0,
      hasLiked: i % 4 === 0,
    } satisfies DemoCollabPost;
  });
}

function buildCollabMembers(members: DemoMember[]): DemoCollabMember[] {
  return members
    .filter((m) => m.visibleInDirectory)
    .map((m) => ({
      id: m.id,
      fullName: m.fullName,
      role: m.role,
      profilePhotoUrl: m.profilePhotoUrl,
      bio: m.bio,
      skills: m.skills,
      availableForCollab: m.availableForCollab,
      company: m.company ? { name: m.company.name } : null,
      memberSince: m.memberSince,
      // Demo members have no real SocialConnection rows (same as the
      // pre-existing getSocialSummaryForMembers behavior, which always
      // returned {} for demo IDs) — directory filters/sort tied to social
      // data are simply a no-op under demo mode.
      socialSummary: [],
      totalFollowers: m.followerCount ?? 0,
      monthlyGrowth: null,
      lastSocialSyncAt: null,
    }));
}

function buildConversations(rng: ReturnType<typeof createRng>, members: DemoMember[]): ConversationSummary[] {
  const previews = [
    "Sounds great, let's set up a time to chat!",
    "Just sent over the contract, take a look when you can.",
    "Thanks so much for the quick turnaround on this.",
    "Can you share your media kit?",
    "Loved the last video — let's do another one.",
    "Following up on the collab post you replied to.",
    "Here's the shot list for Thursday's shoot.",
  ];

  return rng.pickMany(members, 26).map((m, i) => ({
    kind: i % 3 === 0 ? "collab" : "dm",
    id: crypto.randomUUID(),
    routeId: crypto.randomUUID(),
    other: { id: m.id, fullName: m.fullName, profilePhotoUrl: m.profilePhotoUrl },
    isGroup: false,
    displayName: m.fullName,
    subtitle: i % 3 === 0 ? `via Collab Hub · ${rng.pick(PROJECT_NAME_TEMPLATES)}` : null,
    lastMessagePreview: rng.pick(previews),
    unread: rng.bool(0.3),
    updatedAt: subHours(new Date(), rng.int(0, 240)),
  }));
}

function buildProjects(rng: ReturnType<typeof createRng>, members: DemoMember[]): DemoProject[] {
  const statuses = ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
  const brandsAndAgencies = members.filter((m) => m.role === "BRAND" || m.role === "AGENCY");
  const leaders = members.filter((m) => m.role === "CREATOR" || m.role === "PROJECT_LEADER");

  return Array.from({ length: 20 }, (_, i) => {
    const gmv = rng.float(0, 40_000, 2);
    const leader = rng.pick(leaders);
    const brand = brandsAndAgencies.length > 0 ? rng.pick(brandsAndAgencies) : null;

    return {
      id: crypto.randomUUID(),
      organizationId: DEMO_ORG_ID,
      projectCode: `PRJ-DEMO${String(i + 1).padStart(3, "0")}`,
      name: rng.pick(PROJECT_NAME_TEMPLATES),
      description: `Creator collaboration project with ${brand?.company?.name ?? "an internal team"}.`,
      clientId: null,
      brandId: brand?.id ?? null,
      status: rng.pick(statuses),
      deadline: subDays(new Date(), -rng.int(3, 60)),
      projectLeaderId: leader.id,
      budget: new Prisma.Decimal(rng.float(1_000, 50_000, 2)),
      gmv: new Prisma.Decimal(gmv),
      commissionPool: new Prisma.Decimal(Math.round(gmv * 0.15 * 100) / 100),
      startDate: subDays(new Date(), rng.int(0, 90)),
      createdAt: subDays(new Date(), rng.int(10, 120)),
      updatedAt: new Date(),
      brand: brand?.company ? { id: brand.company.id, name: brand.company.name } : null,
      client: null,
      projectLeader: { id: leader.id, fullName: leader.fullName, profilePhotoUrl: leader.profilePhotoUrl },
      _count: { assignments: rng.int(1, 6) },
    } satisfies DemoProject;
  });
}

function buildSpaces(rng: ReturnType<typeof createRng>, members: DemoMember[]): DemoSpace[] {
  const types = [
    "PODCAST_BOOTH", "EDITING_SUITE", "PHOTOGRAPHY_STUDIO", "CONFERENCE_ROOM", "MEETING_ROOM",
    "CREATOR_LOUNGE", "BEAUTY_STATION", "RECORDING_STUDIO", "LIVESTREAM_STUDIO", "CONTENT_LAB",
  ] as const;

  return SPACE_NAMES.map((name, i) => {
    const isOccupied = rng.bool(0.3);
    const occupant = rng.pick(members);
    const status = isOccupied ? "OCCUPIED" : rng.bool(0.2) ? "RESERVED" : "AVAILABLE";

    const todayReservations = Array.from({ length: rng.int(0, 3) }, () => {
      const startTime = subHours(new Date(), -rng.int(1, 8));
      return {
        id: crypto.randomUUID(),
        memberId: occupant.id,
        memberName: occupant.fullName,
        projectName: rng.bool(0.5) ? rng.pick(PROJECT_NAME_TEMPLATES) : null,
        attendeeNames: rng.pickMany(members, rng.int(0, 2)).map((m) => m.fullName),
        startTime,
        endTime: subHours(startTime, -1),
        isCurrent: false,
      };
    });

    return {
      id: crypto.randomUUID(),
      name,
      type: types[i % types.length],
      capacity: rng.int(1, 12),
      location: `Floor ${rng.int(1, 3)}`,
      equipment: rng.pickMany(["Ring light", "Tripod", "Mic", "Green screen", "Backdrop"], rng.int(1, 3)),
      imageUrl: null,
      isActive: true,
      status,
      activeSession: isOccupied
        ? {
            id: crypto.randomUUID(),
            memberId: occupant.id,
            memberName: occupant.fullName,
            memberPhoto: occupant.profilePhotoUrl,
            startedAt: subMinutes(new Date(), rng.int(5, 90)),
            projectName: rng.bool(0.5) ? rng.pick(PROJECT_NAME_TEMPLATES) : null,
          }
        : null,
      currentReservation: null,
      nextReservation:
        todayReservations.length > 0
          ? { memberName: todayReservations[0].memberName, startTime: todayReservations[0].startTime, endTime: todayReservations[0].endTime }
          : null,
      todayReservations,
      upcomingReservations: todayReservations.map((r) => ({
        id: r.id,
        memberId: r.memberId,
        memberName: r.memberName,
        projectName: r.projectName,
        attendeeNames: r.attendeeNames,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
    } satisfies DemoSpace;
  });
}

const DEMO_EVENT_CATEGORIES: EventCategory[] = [
  "NETWORKING",
  "WORKSHOP",
  "CREATOR_MEETUP",
  "PODCAST_RECORDING",
  "BRAND_ACTIVATION",
  "LAUNCH_PARTY",
];

function buildEvents(rng: ReturnType<typeof createRng>, members: DemoMember[]): DemoEvent[] {
  return EVENT_TITLES.map((title) => {
    const eventId = crypto.randomUUID();
    const startTime = subDays(new Date(), -rng.int(2, 30));
    const creator = rng.pick(members);
    const rsvpMembers = rng.pickMany(members, rng.int(4, 14));

    return {
      id: eventId,
      organizationId: DEMO_ORG_ID,
      title,
      description: `Join fellow creators and brand partners for ${title.toLowerCase()}.`,
      location: "CreatorHub360 HQ",
      spaceId: null,
      startTime,
      endTime: subHours(startTime, -2),
      capacity: rng.int(15, 60),
      imageUrl: null,
      createdById: creator.id,
      createdAt: subDays(startTime, 14),
      updatedAt: subDays(startTime, 14),
      status: "PUBLISHED",
      category: rng.pick(DEMO_EVENT_CATEGORIES),
      hostName: creator.fullName,
      hostContact: "hello@creatorhub360.com",
      registrationDeadline: null,
      website: null,
      dressCode: null,
      foodProvided: rng.bool(0.5),
      parkingInfo: null,
      equipmentNeeded: [],
      livestreamUrl: null,
      ticketPriceCents: null,
      isPrivate: false,
      sponsors: null,
      isFeatured: false,
      viewCount: rng.int(20, 300),
      submittedAt: subDays(startTime, 14),
      approvedById: creator.id,
      approvedAt: subDays(startTime, 13),
      rejectedById: null,
      rejectedAt: null,
      rejectionReason: null,
      changeRequestNote: null,
      cancelledById: null,
      cancelledAt: null,
      cancellationReason: null,
      archivedAt: null,
      createdBy: { id: creator.id, fullName: creator.fullName },
      space: null,
      rsvps: rsvpMembers.map((m) => ({
        id: crypto.randomUUID(),
        eventId,
        memberId: m.id,
        status: rng.pick(["GOING", "MAYBE", "NOT_GOING"] as const),
        waitlistPosition: null,
        reminderSentAt: null,
        startingSoonSentAt: null,
        createdAt: subDays(startTime, rng.int(1, 13)),
        updatedAt: subDays(startTime, rng.int(0, 13)),
        member: { id: m.id, fullName: m.fullName, profilePhotoUrl: m.profilePhotoUrl },
      })),
    } satisfies DemoEvent;
  });
}

const NOTIFICATION_TEMPLATES: { type: NotificationType; title: string }[] = [
  { type: "MEMBERSHIP_APPLICATION_RECEIVED", title: "New brand invite from Northlight Beverages" },
  { type: "MENTION", title: "You were mentioned in the Community" },
  { type: "DEADLINE", title: "Project update: Fall Product Launch" },
  { type: "COLLAB_APPLICATION_ACCEPTED", title: "Your collab application was accepted" },
  { type: "DIRECT_MESSAGE_RECEIVED", title: "New message from a brand partner" },
  { type: "COLLAB_APPLICATION_RECEIVED", title: "New application on your collab post" },
  { type: "COLLAB_POST_CLOSED", title: "A collab post you applied to has closed" },
  { type: "SYSTEM", title: "Welcome to CreatorHub360" },
];

function buildNotifications(rng: ReturnType<typeof createRng>, viewerId: string): { rows: DemoNotificationRow[]; summary: DemoNotificationsSummary } {
  const rows: DemoNotificationRow[] = rng.pickMany(NOTIFICATION_TEMPLATES, 8).map((n, i) => ({
    id: crypto.randomUUID(),
    memberId: viewerId,
    type: n.type,
    title: n.title,
    body: null,
    link: null,
    readAt: i < 3 ? null : subHours(new Date(), rng.int(1, 200)),
    createdAt: subHours(new Date(), rng.int(1, 200) + i * 3),
  }));

  return {
    rows,
    summary: {
      unreadCount: rows.filter((r) => r.readAt === null).length,
      recent: rows.slice(0, 2).map((r) => ({ id: r.id, title: r.title, link: r.link })),
    },
  };
}

function buildAdminKpis(rng: ReturnType<typeof createRng>, members: DemoMember[]): DemoAdminKpis {
  const creators = members.filter((m) => m.role === "CREATOR");
  const totalFollowers = creators.reduce((sum, m) => sum + (m.followerCount ?? 0), 0);
  const totalGMV = members.reduce((sum, m) => sum + Number(m.lifetimeGMV), 0);

  return {
    members: {
      totalCreators: creators.length,
      totalMembers: members.length,
      activeMemberships: members.filter((m) => m.status === "ACTIVE").length,
      pendingApplications: rng.int(2, 11),
    },
    brands: { totalBrands: members.filter((m) => m.role === "BRAND").length },
    social: { totalFollowers, combinedSocialReach: Math.round(totalFollowers * 0.62) },
    revenue: {
      membershipRevenueCents: rng.int(400_000, 2_200_000),
      totalGMV,
      totalCommissions: Math.round(totalGMV * 0.15),
    },
  };
}

function buildGmvEntries(rng: ReturnType<typeof createRng>): DemoGmvEntry[] {
  return Array.from({ length: 260 }, () => ({
    channel: rng.pick(REVENUE_CHANNELS),
    amount: rng.float(20, 3_200, 2),
    description: "",
    date: subDays(new Date(), rng.int(0, 365)),
  }));
}

const HOUR_LABELS = ["6am", "8am", "10am", "12pm", "2pm", "4pm", "6pm", "8pm", "10pm"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildAnalyticsBundle(
  rng: ReturnType<typeof createRng>,
  members: DemoMember[],
  spaces: DemoSpace[],
  gmvEntries: DemoGmvEntry[]
): DemoAnalyticsBundle {
  const activeMembers = members.filter((m) => m.status === "ACTIVE").length;

  const occupancyTrend = Array.from({ length: 30 }, (_, i) => ({
    date: format(startOfDay(subDays(new Date(), 29 - i)), "MMM d"),
    checkIns: rng.int(2, 34),
  }));

  const grid = DAY_LABELS.map(() => HOUR_LABELS.map(() => rng.int(0, 18)));

  const spaceUtilization = spaces
    .map((s) => ({ name: s.name, sessions: rng.int(3, 40), hours: rng.float(4, 120, 1) }))
    .sort((a, b) => b.hours - a.hours);

  const gmvSeries = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), 11 - i);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const gmv = gmvEntries
      .filter((e) => `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}` === monthKey)
      .reduce((sum, e) => sum + e.amount, 0);
    return { month: monthKey, gmv };
  });

  const byGmvDesc = (a: DemoMember, b: DemoMember) => Number(b.currentGMV) - Number(a.currentGMV);
  const creatorLeaders = [...members].filter((m) => m.role === "CREATOR").sort(byGmvDesc).slice(0, 10);
  const agencyLeaders = [...members].filter((m) => m.role === "AGENCY").sort(byGmvDesc).slice(0, 10);
  const brandLeaders = [...members].filter((m) => m.role === "BRAND").sort(byGmvDesc).slice(0, 10);

  const leaderboards = {
    creators: creatorLeaders.map((m) => ({ id: m.id, name: m.fullName, gmv: Number(m.currentGMV), photoUrl: m.profilePhotoUrl })),
    agencies: agencyLeaders.map((m) => ({ id: m.id, name: m.fullName, gmv: Number(m.currentGMV), photoUrl: m.profilePhotoUrl })),
    brokers: [] as { id: string; name: string; gmv: number; photoUrl: string | null }[],
    brands: brandLeaders.map((m) => ({ id: m.id, name: m.company?.name ?? m.fullName, gmv: Number(m.currentGMV) })),
    companies: [] as { id: string; name: string; gmv: number }[],
    projects: rng.pickMany(PROJECT_NAME_TEMPLATES, 6).map((name) => ({ id: crypto.randomUUID(), name, gmv: rng.float(500, 30_000, 2) })),
  };

  const revenueTotals = new Map<RevenueChannel, number>();
  for (const c of REVENUE_CHANNELS) revenueTotals.set(c, 0);
  for (const e of gmvEntries) revenueTotals.set(e.channel, (revenueTotals.get(e.channel) ?? 0) + e.amount);
  const revenueTotal = Array.from(revenueTotals.values()).reduce((sum, v) => sum + v, 0);
  const revenueBreakdown = {
    channels: NAMED_CHANNELS.map((channel) => {
      const amount = revenueTotals.get(channel) ?? 0;
      return { channel, label: CHANNEL_LABELS[channel], amount, percentOfTotal: revenueTotal > 0 ? (amount / revenueTotal) * 100 : 0 };
    }).sort((a, b) => b.amount - a.amount),
    otherAmount: revenueTotals.get("OTHER") ?? 0,
    total: revenueTotal,
  };

  const communityDaily = Array.from({ length: 30 }, (_, i) => ({
    date: format(startOfDay(subDays(new Date(), 29 - i)), "MMM d"),
    posts: rng.int(0, 3),
    applications: rng.int(0, 6),
    messages: rng.int(2, 22),
  }));

  const memberGrowth = (() => {
    let cumulative = Math.max(0, members.length - rng.int(20, 40));
    return Array.from({ length: 6 }, (_, i) => {
      const newMembers = i === 5 ? Math.max(0, members.length - cumulative) : rng.int(2, 12);
      cumulative += newMembers;
      return { month: format(subMonths(new Date(), 5 - i), "MMM"), newMembers, cumulative };
    });
  })();

  return {
    summary: { averageHours: rng.float(1, 6, 1), activeMembers, totalMembers: members.length },
    occupancyTrend,
    heatmap: { days: DAY_LABELS, hours: HOUR_LABELS, grid, max: Math.max(1, ...grid.flat()) },
    spaceUtilization,
    gmvSeries,
    leaderboards,
    revenueBreakdown,
    communityEngagement: { daily: communityDaily, activeMembers: rng.int(30, 80) },
    memberGrowth,
  };
}

let cached: DemoUniverse | null = null;

/** Lazily builds the shared demo dataset once per process, then reuses it. */
export function getDemoUniverse(): DemoUniverse {
  if (cached) return cached;

  const rng = createRng(SEED);

  const creators = Array.from({ length: 115 }, (_, i) => buildMember(rng, { role: "CREATOR", index: i }));
  const brandsAndAgencies = Array.from({ length: 15 }, (_, i) =>
    buildMember(rng, { role: rng.bool(0.6) ? "BRAND" : "AGENCY", index: 115 + i })
  );
  const members = [...creators, ...brandsAndAgencies];
  const spaces = buildSpaces(rng, members);
  const gmvEntries = buildGmvEntries(rng);
  const { rows: notificationRows, summary: notifications } = buildNotifications(rng, members[0].id);

  cached = {
    members,
    creators,
    brandsAndAgencies,
    collabPosts: buildCollabPosts(rng, members),
    collabMembers: buildCollabMembers(members),
    conversations: buildConversations(rng, members),
    projects: buildProjects(rng, members),
    spaces,
    events: buildEvents(rng, members),
    notifications,
    notificationRows,
    adminKpis: buildAdminKpis(rng, members),
    gmvEntries,
    analytics: buildAnalyticsBundle(rng, members, spaces, gmvEntries),
  };

  return cached;
}
