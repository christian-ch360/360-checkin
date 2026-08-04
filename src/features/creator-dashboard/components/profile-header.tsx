import Link from "next/link";
import { format } from "date-fns";
import {
  MapPin,
  Globe,
  Building2,
  BadgeCheck,
  ShieldQuestion,
  ShieldAlert,
  CalendarDays,
  Camera,
  Music2,
  Video,
  Settings as SettingsIcon,
} from "lucide-react";
import type { MemberRole, VerificationStatus, ContentCategory } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import { formatCompactNumber } from "@/lib/utils/format";
import { ProfileEditDialog } from "@/features/creator-dashboard/components/profile-edit-dialog";
import { CollabAvailabilityToggle } from "@/features/creator-dashboard/components/collab-availability-toggle";
import { MemberAvatarUpload } from "@/features/members/components/member-avatar-upload";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { SOCIAL_META } from "@/features/integrations/config/social-meta";
import { instagramUrl, tiktokUrl, youtubeUrl } from "@/lib/utils/social-links";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";

type SocialConnections = Awaited<ReturnType<typeof getConnectionsForMember>>;

const VERIFICATION_META: Record<VerificationStatus, { label: string; icon: typeof BadgeCheck; tone: keyof typeof statusToneClass }> = {
  VERIFIED: { label: "Verified", icon: BadgeCheck, tone: "success" },
  PENDING: { label: "Verification pending", icon: ShieldQuestion, tone: "warning" },
  UNVERIFIED: { label: "Not verified", icon: ShieldAlert, tone: "neutral" },
};

export function ProfileHeader({
  member,
  membershipStatusLabel,
  connections,
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
    verificationStatus: VerificationStatus;
    memberSince: Date;
    phone: string | null;
    skills: string[];
    contentCategories: ContentCategory[];
    lookingFor: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    linkedinUrl: string | null;
    availableForCollab: boolean;
    visibleInDirectory: boolean;
  };
  membershipStatusLabel: string | null;
  connections: SocialConnections;
}) {
  const verification = VERIFICATION_META[member.verificationStatus];
  const VerificationIcon = verification.icon;
  const connectedPlatforms = connections.filter((c) => c.status === "CONNECTED" && c.followerCount != null);
  const socialLinks = [
    { href: instagramUrl(member.instagramUrl), icon: Camera, label: "Instagram" },
    { href: tiktokUrl(member.tiktokUrl), icon: Music2, label: "TikTok" },
    { href: youtubeUrl(member.youtubeUrl), icon: Video, label: "YouTube" },
  ].filter((link): link is { href: string; icon: typeof Camera; label: string } => Boolean(link.href));

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div
        className={cn(
          "aspect-[3/1] w-full sm:aspect-[4/1]",
          !member.bannerImageUrl && "bg-gradient-to-br from-primary/20 via-community/10 to-transparent"
        )}
      >
        {member.bannerImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.bannerImageUrl} alt="" className="size-full object-cover" />
        )}
      </div>

      <div className="px-4 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-10 flex items-end justify-between gap-3 sm:-mt-12">
          <MemberAvatarUpload
            memberId={member.id}
            currentUrl={member.profilePhotoUrl}
            fullName={member.fullName}
            canEdit
            size={80}
          />
          <div className="mb-1 flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/settings">
                <SettingsIcon className="size-3.5" /> Account settings
              </Link>
            </Button>
            <ProfileEditDialog
              profile={{
                fullName: member.fullName,
                username: member.username,
                displayName: member.displayName,
                phone: member.phone,
                website: member.website,
                location: member.location,
                bio: member.bio,
                profilePhotoUrl: member.profilePhotoUrl,
                bannerImageUrl: member.bannerImageUrl,
                skills: member.skills,
                contentCategories: member.contentCategories,
                lookingFor: member.lookingFor,
                instagramUrl: member.instagramUrl,
                tiktokUrl: member.tiktokUrl,
                youtubeUrl: member.youtubeUrl,
                linkedinUrl: member.linkedinUrl,
                availableForCollab: member.availableForCollab,
                visibleInDirectory: member.visibleInDirectory,
              }}
            />
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {member.displayName || member.fullName}
            </h1>
            <Badge variant="outline" className={cn(statusToneClass[verification.tone])}>
              <VerificationIcon className="size-3" />
              {verification.label}
            </Badge>
          </div>
          {member.username && <p className="text-sm text-muted-foreground">@{member.username}</p>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
          {membershipStatusLabel && <Badge variant="outline">{membershipStatusLabel}</Badge>}
        </div>

        {member.bio && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{member.bio}</p>}

        {member.contentCategories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {member.contentCategories.map((category) => (
              <Badge key={category} variant="secondary" className="text-xs font-normal">
                {CONTENT_CATEGORY_LABELS[category]}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
          {member.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" /> {member.location}
            </span>
          )}
          {member.company && (
            <span className="flex items-center gap-1">
              <Building2 className="size-3.5" /> {member.company.name}
            </span>
          )}
          {member.website && (
            <Link
              href={member.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-info hover:underline"
            >
              <Globe className="size-3.5" /> {member.website.replace(/^https?:\/\//, "")}
            </Link>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" /> Member since {format(member.memberSince, "MMM yyyy")}
          </span>
        </div>

        {socialLinks.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {socialLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <link.icon className="size-3.5" /> {link.label}
              </Link>
            ))}
          </div>
        )}

        {connectedPlatforms.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {connectedPlatforms.map((connection) => (
              <span key={connection.platform} className="flex items-center gap-1.5 text-sm font-medium">
                <span className="text-muted-foreground">{SOCIAL_META[connection.platform]?.icon}</span>
                {formatCompactNumber(connection.followerCount!)}
                <span className="font-normal text-muted-foreground">{connection.label} followers</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4">
          <CollabAvailabilityToggle
            availableForCollab={member.availableForCollab}
            profile={{
              skills: member.skills,
              contentCategories: member.contentCategories,
              lookingFor: member.lookingFor,
              instagramUrl: member.instagramUrl,
              tiktokUrl: member.tiktokUrl,
              youtubeUrl: member.youtubeUrl,
              linkedinUrl: member.linkedinUrl,
              visibleInDirectory: member.visibleInDirectory,
            }}
          />
        </div>
      </div>
    </div>
  );
}
