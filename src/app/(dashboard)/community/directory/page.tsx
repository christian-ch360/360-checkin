import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listCollabMembers, listAllSkills, type CollabSortKey } from "@/features/collab-hub/services/collab-hub.service";
import { CollabMemberCard } from "@/features/collab-hub/components/collab-member-card";
import { CollabFilters } from "@/features/collab-hub/components/collab-filters";
import { Card, CardContent } from "@/components/ui/card";
import { isDemoModeActive, demoListCollabMembers, demoListAllSkills } from "@/features/demo-data";
import type { MemberRole, ContentCategory, SocialPlatform } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = { title: "Directory · Community" };

export default async function CommunityDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    role?: string;
    skill?: string;
    category?: string;
    available?: string;
    platforms?: string;
    minFollowers?: string;
    verified?: string;
    recentlySynced?: string;
    location?: string;
    sort?: string;
  }>;
}) {
  const actor = await requireCurrentMember();
  const params = await searchParams;
  const isDemo = isDemoModeActive(actor);

  const memberFilters = {
    search: params.search,
    role: params.role as MemberRole | undefined,
    skill: params.skill,
    category: params.category as ContentCategory | undefined,
    availableOnly: params.available === "1",
    platforms: params.platforms ? (params.platforms.split(",") as SocialPlatform[]) : undefined,
    minFollowers: params.minFollowers ? Number(params.minFollowers) : undefined,
    verifiedOnly: params.verified === "1",
    recentlySyncedOnly: params.recentlySynced === "1",
    location: params.location,
    sort: params.sort as CollabSortKey | undefined,
  };

  // listCollabMembers already attaches each member's socialSummary from one
  // cached, org-wide aggregate query — no second social-data fetch needed
  // here. Demo mode has no real SocialConnection rows, so its fixture
  // members carry an empty summary (same effectively-harmless outcome the
  // batched query used to produce for demo IDs).
  const [members, skills] = isDemo
    ? [demoListCollabMembers(memberFilters), demoListAllSkills()]
    : await Promise.all([listCollabMembers(actor.organizationId, memberFilters), listAllSkills(actor.organizationId)]);

  return (
    <div className="space-y-8">
      <CollabFilters skills={skills} />

      {members.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No members match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <CollabMemberCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
