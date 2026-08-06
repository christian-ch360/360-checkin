import { Users } from "lucide-react";
import type { MemberRole, VerificationStatus, ContentCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileHeader } from "@/features/creator-dashboard/components/profile-header";
import { SocialPresence } from "@/features/integrations/components/social-presence";
import { CreatorSocialSummary } from "@/features/integrations/components/creator-social-summary";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";
import type { getFollowerGrowthForMember } from "@/features/integrations/services/follower-growth.service";

type SocialConnections = Awaited<ReturnType<typeof getConnectionsForMember>>;
type FollowerGrowthByPlatform = Awaited<ReturnType<typeof getFollowerGrowthForMember>>;

export function ProfileTab({
  member,
  membershipStatusLabel,
  connections,
  growth,
}: {
  member: {
    id: string;
    profilePhotoUrl: string | null;
    bannerImageUrl: string | null;
    fullName: string;
    username: string | null;
    displayName: string | null;
    role: MemberRole;
    bio: string | null;
    location: string | null;
    website: string | null;
    company: { id: string; name: string } | null;
    followerCount: number | null;
    platforms: string[];
    verificationStatus: VerificationStatus;
    skills: string[];
    contentCategories: ContentCategory[];
    availableForCollab: boolean;
    visibleInDirectory: boolean;
    lookingFor: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    linkedinUrl: string | null;
    memberSince: Date;
    phone: string | null;
    email: string;
  };
  membershipStatusLabel: string | null;
  connections: SocialConnections;
  growth: FollowerGrowthByPlatform;
}) {
  return (
    <div className="space-y-4">
      <ProfileHeader member={member} membershipStatusLabel={membershipStatusLabel} connections={connections} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm font-medium">Skills</p>
              {member.skills.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {member.skills.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">No skills added yet.</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">Looking for</p>
              <p className="mt-1 text-sm text-muted-foreground">{member.lookingFor || "Nothing specified yet."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Followers</p>
                <p className="text-lg font-semibold tracking-tight">
                  {member.followerCount != null ? member.followerCount.toLocaleString() : "—"}
                </p>
              </div>
            </div>
            {member.platforms.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {member.platforms.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[10px] font-normal">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreatorSocialSummary connections={connections} />
      <SocialPresence connections={connections} growth={growth} variant="member" />
    </div>
  );
}
