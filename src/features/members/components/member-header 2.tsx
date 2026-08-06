"use client";

import { useState } from "react";
import { Mail, Phone, Building2, MapPin, Pencil, Handshake } from "lucide-react";
import type { MemberRole, MemberStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemberStatusBadge } from "@/features/members/components/member-status-badge";
import { TierBadge } from "@/features/members/components/tier-badge";
import { MemberForm } from "@/features/members/components/member-form";
import { MemberCollabProfile } from "@/features/members/components/member-collab-profile";
import { FollowButton } from "@/features/members/components/follow-button";
import { MemberAvatarUpload } from "@/features/members/components/member-avatar-upload";
import { ROLE_LABELS } from "@/features/members/role-labels";

export function MemberHeader({
  member,
  companies,
  commissionTiers,
  canEdit,
  currentMemberId,
  isFollowing,
}: {
  member: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    memberNumber: string;
    role: MemberRole;
    status: MemberStatus;
    profilePhotoUrl: string | null;
    memberSince: string;
    location: string | null;
    company: { id: string; name: string } | null;
    commissionTier: { code: string; percentage: string } | null;
    commissionTierId: string | null;
    referralSource: string | null;
    bio: string | null;
    skills: string[];
    availableForCollab: boolean;
    lookingFor: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    linkedinUrl: string | null;
  };
  companies: { id: string; name: string }[];
  commissionTiers: { id: string; code: string; name: string; percentage: string }[];
  /** Whether the viewer may edit this member's profile fields — computed server-side (see canEditMemberProfile). */
  canEdit: boolean;
  currentMemberId: string;
  isFollowing: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <MemberAvatarUpload
            memberId={member.id}
            currentUrl={member.profilePhotoUrl}
            fullName={member.fullName}
            canEdit={canEdit}
            size={64}
          />
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{member.fullName}</h1>
              <MemberStatusBadge status={member.status} />
              {member.commissionTier && (
                <TierBadge code={member.commissionTier.code} percentage={member.commissionTier.percentage} />
              )}
              {member.availableForCollab && (
                <Badge variant="outline" className="gap-1 text-emerald-600 dark:text-emerald-400">
                  <Handshake className="size-3" /> Open to collab
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {member.memberNumber} · {ROLE_LABELS[member.role]}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {member.email}
              </span>
              {member.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5" /> {member.phone}
                </span>
              )}
              {member.company && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3.5" /> {member.company.name}
                </span>
              )}
              {member.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> {member.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {member.id !== currentMemberId && <FollowButton memberId={member.id} initialFollowing={isFollowing} />}

        {canEdit && (
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <MemberForm
              open={editOpen}
              onOpenChange={setEditOpen}
              companies={companies}
              commissionTiers={commissionTiers}
              member={{
                id: member.id,
                fullName: member.fullName,
                email: member.email,
                phone: member.phone,
                role: member.role,
                status: member.status,
                companyId: member.company?.id ?? null,
                commissionTierId: member.commissionTierId,
                referralSource: member.referralSource,
                instagramUrl: member.instagramUrl,
                tiktokUrl: member.tiktokUrl,
                youtubeUrl: member.youtubeUrl,
                linkedinUrl: member.linkedinUrl,
              }}
            />
          </>
        )}
      </div>

      <MemberCollabProfile
        member={{
          bio: member.bio,
          skills: member.skills,
          lookingFor: member.lookingFor,
          instagramUrl: member.instagramUrl,
          tiktokUrl: member.tiktokUrl,
          youtubeUrl: member.youtubeUrl,
          linkedinUrl: member.linkedinUrl,
        }}
      />
    </div>
  );
}
