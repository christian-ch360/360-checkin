"use client";

import { Globe, MapPin, Camera, Clapperboard, Link2, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgencyProfileInput } from "@/features/agencies/schemas/agency-profile.schema";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

/** "Preview how creators see the agency profile." Read-only mirror of what a creator sees when
 * browsing this agency — same fields as AgencyProfileForm, none of the edit affordances. */
export function AgencyProfilePreview({
  profile,
  photoUrl,
}: {
  profile: AgencyProfileInput;
  photoUrl: string | null;
}) {
  const links = [
    profile.instagramUrl && { icon: Camera, label: "Instagram", href: profile.instagramUrl },
    profile.tiktokUrl && { icon: Globe, label: "TikTok", href: profile.tiktokUrl },
    profile.youtubeUrl && { icon: Clapperboard, label: "YouTube", href: profile.youtubeUrl },
    profile.linkedinUrl && { icon: Link2, label: "LinkedIn", href: profile.linkedinUrl },
  ].filter((l): l is { icon: typeof Camera; label: string; href: string } => Boolean(l));

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-2">
        <Eye className="size-4 text-muted-foreground" />
        <CardTitle className="text-sm font-semibold">Creator Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border bg-muted/20 p-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-16 border-4 border-card">
              {photoUrl && <AvatarImage src={photoUrl} alt={profile.fullName} />}
              <AvatarFallback className="text-lg">{initials(profile.fullName || "Agency")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{profile.fullName || "Untitled Agency"}</p>
              {profile.location && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {profile.location}
                </p>
              )}
            </div>
          </div>

          {profile.bio && <p className="mt-4 text-sm text-muted-foreground">{profile.bio}</p>}

          {profile.agencyCategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.agencyCategories.map((c) => (
                <Badge key={c} variant="outline" className="text-xs">
                  {c}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {profile.website && (
              <a
                href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Globe className="size-3.5" />
                Website
              </a>
            )}
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <l.icon className="size-3.5" />
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
