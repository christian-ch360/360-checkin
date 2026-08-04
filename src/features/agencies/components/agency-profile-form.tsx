"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MemberAvatarUpload } from "@/features/members/components/member-avatar-upload";
import { updateAgencyProfileAction } from "@/features/agencies/services/agency-actions";
import { AgencyProfilePreview } from "@/features/agencies/components/agency-profile-preview";
import type { AgencyProfileInput } from "@/features/agencies/schemas/agency-profile.schema";

export function AgencyProfileForm({
  agencyId,
  canEdit,
  initial,
}: {
  agencyId: string;
  canEdit: boolean;
  initial: AgencyProfileInput & { profilePhotoUrl: string | null };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState(initial.fullName);
  const [website, setWebsite] = useState(initial.website ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [location, setLocation] = useState(initial.location ?? "");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState(initial.businessRegistrationNumber ?? "");
  const [categories, setCategories] = useState<string[]>(initial.agencyCategories);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [instagramUrl, setInstagramUrl] = useState(initial.instagramUrl ?? "");
  const [tiktokUrl, setTiktokUrl] = useState(initial.tiktokUrl ?? "");
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtubeUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(initial.linkedinUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  function addCategory() {
    const value = categoryDraft.trim();
    if (!value || categories.includes(value) || categories.length >= 10) return;
    setCategories([...categories, value]);
    setCategoryDraft("");
  }

  function handleCategoryKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCategory();
    }
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await updateAgencyProfileAction({
        fullName,
        website,
        bio,
        location,
        businessRegistrationNumber,
        agencyCategories: categories,
        instagramUrl,
        tiktokUrl,
        youtubeUrl,
        linkedinUrl,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success("Agency profile updated.");
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Agency Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-4">
          <MemberAvatarUpload memberId={agencyId} currentUrl={initial.profilePhotoUrl} fullName={fullName} canEdit={canEdit} size={72} />
          <div>
            <p className="text-sm font-medium">Logo</p>
            <p className="text-xs text-muted-foreground">Shown on your creator-facing profile.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-name">Agency name</Label>
          <Input id="agency-name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!canEdit} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-website">Website</Label>
          <Input id="agency-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://youragency.com" disabled={!canEdit} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-description">Description</Label>
          <Textarea
            id="agency-description"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Tell creators what your agency does."
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-headquarters">Headquarters</Label>
          <Input id="agency-headquarters" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Los Angeles, CA" disabled={!canEdit} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-registration">Business registration number</Label>
          <Input
            id="agency-registration"
            value={businessRegistrationNumber}
            onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="agency-categories">Categories</Label>
          {canEdit && (
            <Input
              id="agency-categories"
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              onKeyDown={handleCategoryKeyDown}
              onBlur={addCategory}
              placeholder="Type a category and press Enter (e.g. Beauty, Gaming)"
            />
          )}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {categories.map((c) => (
                <Badge key={c} variant="secondary" className="gap-1 text-xs">
                  {c}
                  {canEdit && (
                    <button type="button" onClick={() => setCategories(categories.filter((x) => x !== c))} className="ml-0.5">
                      <X className="size-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="agency-instagram">Instagram</Label>
            <Input id="agency-instagram" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency-tiktok">TikTok</Label>
            <Input id="agency-tiktok" value={tiktokUrl} onChange={(e) => setTiktokUrl(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency-youtube">YouTube</Label>
            <Input id="agency-youtube" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agency-linkedin">LinkedIn</Label>
            <Input id="agency-linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} disabled={!canEdit} />
          </div>
        </div>

        {canEdit && (
          <Button onClick={handleSubmit} disabled={isPending || !fullName.trim()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        )}
      </CardContent>
    </Card>

      <AgencyProfilePreview
        photoUrl={initial.profilePhotoUrl}
        profile={{
          fullName,
          website,
          bio,
          location,
          businessRegistrationNumber,
          agencyCategories: categories,
          instagramUrl,
          tiktokUrl,
          youtubeUrl,
          linkedinUrl,
        }}
      />
    </div>
  );
}
