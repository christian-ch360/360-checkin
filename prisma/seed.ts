import { PrismaClient, SpaceType, type MemberRole } from "@prisma/client";
import { randomBytes, createHmac } from "crypto";

const prisma = new PrismaClient();

const QR_SECRET = process.env.QR_SECRET ?? "dev-only-secret-do-not-use-in-production-00000000";

function qrToken(type: string) {
  const random = randomBytes(16).toString("hex");
  const payload = `${type}.${random}`;
  const signature = createHmac("sha256", QR_SECRET).update(payload).digest("hex").slice(0, 24);
  return `${payload}.${signature}`;
}

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: "creatorhub360" },
    update: {},
    create: { name: "CreatorHub360", slug: "creatorhub360" },
  });

  const tierDefs = [
    { code: "A" as const, name: "Tier A", percentage: 12 },
    { code: "B" as const, name: "Tier B", percentage: 10 },
    { code: "C" as const, name: "Tier C", percentage: 7 },
    { code: "D" as const, name: "Tier D", percentage: 5 },
    { code: "E" as const, name: "Tier E", percentage: 3 },
  ];

  const tiers = await Promise.all(
    tierDefs.map((t) =>
      prisma.commissionTier.upsert({
        where: { organizationId_code: { organizationId: org.id, code: t.code } },
        update: { percentage: t.percentage },
        create: { organizationId: org.id, code: t.code, name: t.name, percentage: t.percentage },
      })
    )
  );

  const company = await prisma.company.create({
    data: { organizationId: org.id, name: "Acme Media Co.", website: "https://acme.example.com" },
  });

  const brand = await prisma.brand.create({
    data: { organizationId: org.id, companyId: company.id, name: "Acme Streetwear" },
  });
  await prisma.qRAsset.create({ data: { type: "BRAND", brandId: brand.id, token: qrToken("BRAND") } });

  const membersDef: { fullName: string; email: string; role: MemberRole; tier: string }[] = [
    { fullName: "Jane Creator", email: "jane@creatorhub360.dev", role: "CREATOR", tier: "A" },
    { fullName: "Marcus Agency", email: "marcus@creatorhub360.dev", role: "AGENCY", tier: "B" },
    { fullName: "Priya Broker", email: "priya@creatorhub360.dev", role: "BROKER", tier: "C" },
    { fullName: "Sam Biz Dev", email: "sam@creatorhub360.dev", role: "BUSINESS_DEVELOPMENT", tier: "D" },
    { fullName: "Alex Lead", email: "alex@creatorhub360.dev", role: "PROJECT_LEADER", tier: "B" },
  ];

  const members = [];
  for (let i = 0; i < membersDef.length; i++) {
    const def = membersDef[i];
    const tier = tiers.find((t) => t.code === def.tier)!;
    const member = await prisma.member.create({
      data: {
        organizationId: org.id,
        memberNumber: `CH360-${String(i + 1).padStart(6, "0")}`,
        fullName: def.fullName,
        email: def.email,
        role: def.role,
        companyId: company.id,
        commissionTierId: tier.id,
        systemRole: i === 0 ? "SUPER_ADMIN" : "MEMBER",
      },
    });
    await prisma.qRAsset.create({ data: { type: "MEMBER", memberId: member.id, token: qrToken("MEMBER") } });
    members.push(member);
  }

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      projectCode: "PRJ-000001",
      name: "Summer Creator Campaign",
      description: "Cross-platform campaign for the summer streetwear drop.",
      brandId: brand.id,
      clientId: company.id,
      status: "ACTIVE",
      projectLeaderId: members[4].id,
      budget: 25000,
    },
  });
  await prisma.qRAsset.create({ data: { type: "PROJECT", projectId: project.id, token: qrToken("PROJECT") } });

  await prisma.projectAssignment.create({
    data: {
      projectId: project.id,
      memberId: members[0].id,
      role: "Creator",
      commissionPct: 12,
      contributionPct: 50,
    },
  });

  const SPACE_EQUIPMENT: Record<SpaceType, string[]> = {
    [SpaceType.BEAUTY_STATION]: ["Vanity mirror", "Ring light", "Styling chair"],
    [SpaceType.PODCAST_BOOTH]: ["Podcast mics x2", "Audio mixer", "Headphones"],
    [SpaceType.RECORDING_STUDIO]: ["Audio interface", "Studio monitors", "Acoustic treatment", "Boom mic"],
    [SpaceType.PHOTOGRAPHY_STUDIO]: ["Studio lights", "Backdrop stands", "Reflectors", "Tripod"],
    [SpaceType.LIVESTREAM_STUDIO]: ["Streaming PC", "Capture card", "Ring light", "Green screen"],
    [SpaceType.EDITING_SUITE]: ["Editing workstation", "Color-calibrated monitor", "Headphones"],
    [SpaceType.MEETING_ROOM]: ["Whiteboard", "TV display", "Conference phone"],
    [SpaceType.CONFERENCE_ROOM]: ["Large display", "Video conferencing bar", "Whiteboard"],
    [SpaceType.CREATOR_LOUNGE]: ["String lights", "Lounge seating", "Bluetooth speaker"],
    [SpaceType.CONTENT_LAB]: ["Multi-cam rig", "Lighting kit", "Prop shelf"],
    [SpaceType.EVENT_SPACE]: ["PA system", "Stage lighting", "Portable seating"],
    [SpaceType.CONTENT_BOOTH]: ["Ring light", "Backdrop", "Tripod", "Phone/camera mount"],
  };

  const spaceDefs: { name: string; type: SpaceType; location: string | null; capacity: number | null }[] = [
    ...Array.from({ length: 8 }, (_, i) => ({
      name: `Beauty Chair ${i + 1}`,
      type: SpaceType.BEAUTY_STATION,
      location: null,
      capacity: null,
    })),
    { name: "Podcast Room", type: SpaceType.PODCAST_BOOTH, location: null, capacity: null },
    { name: "Recording Studio", type: SpaceType.RECORDING_STUDIO, location: null, capacity: null },
    { name: "Photography Studio", type: SpaceType.PHOTOGRAPHY_STUDIO, location: null, capacity: null },
    { name: "Livestream Studio", type: SpaceType.LIVESTREAM_STUDIO, location: null, capacity: null },
    { name: "Editing Suite", type: SpaceType.EDITING_SUITE, location: null, capacity: null },
    { name: "Meeting Room A", type: SpaceType.MEETING_ROOM, location: null, capacity: 8 },
    { name: "Meeting Room B", type: SpaceType.MEETING_ROOM, location: null, capacity: 8 },
    { name: "Conference Room", type: SpaceType.CONFERENCE_ROOM, location: null, capacity: 16 },
    { name: "Creator Lounge", type: SpaceType.CREATOR_LOUNGE, location: null, capacity: 15 },
    { name: "Content Lab", type: SpaceType.CONTENT_LAB, location: null, capacity: null },
    { name: "Rooftop", type: SpaceType.CREATOR_LOUNGE, location: "roof", capacity: 20 },
    { name: "Event Space", type: SpaceType.EVENT_SPACE, location: null, capacity: 60 },
    ...Array.from({ length: 20 }, (_, i) => ({
      name: `Booth ${i + 1}`,
      type: SpaceType.CONTENT_BOOTH,
      location: null,
      capacity: null,
    })),
  ];

  for (const def of spaceDefs) {
    const space = await prisma.space.create({
      data: {
        organizationId: org.id,
        name: def.name,
        type: def.type,
        location: def.location,
        capacity: def.capacity,
        equipment: SPACE_EQUIPMENT[def.type] ?? [],
      },
    });
    await prisma.qRAsset.create({ data: { type: "SPACE", spaceId: space.id, token: qrToken("SPACE") } });
  }

  const locationDefs: { name: string; slug: string; type: "ENTRANCE" | "BOOTH" | "PODCAST_ROOM" | "RECORDING_STUDIO" | "BEAUTY_CHAIR" | "ROOFTOP" | "CONFERENCE_ROOM" | "EDITING_BAY"; capacity?: number }[] = [
    { name: "Entrance", slug: "entrance", type: "ENTRANCE" },
    ...Array.from({ length: 20 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return { name: `Booth ${n}`, slug: `booth-${n}`, type: "BOOTH" as const, capacity: 2 };
    }),
    ...Array.from({ length: 8 }, (_, i) => {
      const n = String(i + 1).padStart(2, "0");
      return { name: `Beauty Chair ${i + 1}`, slug: `beauty-chair-${n}`, type: "BEAUTY_CHAIR" as const, capacity: 1 };
    }),
    { name: "Podcast Room", slug: "podcast-room", type: "PODCAST_ROOM", capacity: 6 },
    { name: "Recording Studio", slug: "recording-studio", type: "RECORDING_STUDIO", capacity: 4 },
    { name: "Rooftop", slug: "rooftop", type: "ROOFTOP", capacity: 50 },
    { name: "Conference Room", slug: "conference-room", type: "CONFERENCE_ROOM", capacity: 12 },
    { name: "Editing Bay", slug: "editing-bay", type: "EDITING_BAY", capacity: 2 },
  ];

  const locations = await Promise.all(
    locationDefs.map((def) =>
      prisma.location.upsert({
        where: { organizationId_slug: { organizationId: org.id, slug: def.slug } },
        update: { name: def.name, type: def.type, capacity: def.capacity },
        create: {
          organizationId: org.id,
          name: def.name,
          slug: def.slug,
          type: def.type,
          capacity: def.capacity,
        },
      })
    )
  );
  for (const location of locations) {
    const existingQr = await prisma.qRAsset.findFirst({ where: { type: "LOCATION", locationId: location.id } });
    if (!existingQr) {
      await prisma.qRAsset.create({ data: { type: "LOCATION", locationId: location.id, token: qrToken("LOCATION") } });
    }
  }

  console.log("Seed complete:", {
    organization: org.name,
    tiers: tiers.length,
    members: members.length,
    project: project.name,
    locations: locations.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
