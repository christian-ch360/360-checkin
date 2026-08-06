import Link from "next/link";
import type { MemberRole } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FollowerBadges } from "@/features/integrations/components/follower-badges";
import { ROLE_LABELS } from "@/features/members/role-labels";
import type { SocialSummaryEntry } from "@/features/integrations/services/social-connections.service";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CollabMemberCard({
  member,
}: {
  member: {
    id: string;
    fullName: string;
    role: MemberRole;
    profilePhotoUrl: string | null;
    bio: string | null;
    skills: string[];
    availableForCollab: boolean;
    company: { name: string } | null;
    socialSummary: SocialSummaryEntry[];
  };
}) {
  return (
    <Link href={`/members/${member.id}`}>
      <Card className="h-full border shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                {member.profilePhotoUrl && <AvatarImage src={member.profilePhotoUrl} alt={member.fullName} />}
                <AvatarFallback className="text-base">{initials(member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">{member.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[member.role]}
                  {member.company ? ` · ${member.company.name}` : ""}
                </p>
                <FollowerBadges summary={member.socialSummary} className="mt-0.5" />
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                member.availableForCollab
                  ? "shrink-0 border-community/20 bg-community/10 text-community"
                  : "shrink-0 border-transparent bg-muted text-muted-foreground"
              }
            >
              {member.availableForCollab ? "Open to collab" : "Not available"}
            </Badge>
          </div>

          {member.bio && <p className="line-clamp-2 text-sm text-muted-foreground">{member.bio}</p>}

          {member.skills.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
              {member.skills.slice(0, 5).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
