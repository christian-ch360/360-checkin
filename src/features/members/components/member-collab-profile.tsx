import { Camera, Music2, Video, Briefcase, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { instagramUrl, tiktokUrl, youtubeUrl, linkedinUrl, isNoAccountValue } from "@/lib/utils/social-links";

type OptionalSocialLink = { href: string; icon: typeof Camera; label: string };

function optionalSocialLinks(member: {
  youtubeUrl: string | null;
  linkedinUrl: string | null;
}): OptionalSocialLink[] {
  const links: OptionalSocialLink[] = [];
  const youtube = youtubeUrl(member.youtubeUrl);
  const linkedin = linkedinUrl(member.linkedinUrl);
  if (youtube) links.push({ href: youtube, icon: Video, label: "YouTube" });
  if (linkedin) links.push({ href: linkedin, icon: Briefcase, label: "LinkedIn" });
  return links;
}

export function MemberCollabProfile({
  member,
}: {
  member: {
    bio: string | null;
    skills: string[];
    lookingFor: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    linkedinUrl: string | null;
  };
}) {
  const instagram = instagramUrl(member.instagramUrl);
  const tiktok = tiktokUrl(member.tiktokUrl);
  const optionalLinks = optionalSocialLinks(member);
  const hasAnything = member.bio || member.skills.length > 0 || member.lookingFor || instagram || tiktok || optionalLinks.length > 0;

  if (!hasAnything) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <Sparkles className="size-4 text-primary" /> Collab Hub profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {member.bio && <p className="text-sm text-muted-foreground">{member.bio}</p>}

        {member.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {member.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="font-normal">
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {member.lookingFor && (
          <p className="text-sm">
            <span className="font-medium">Looking for:</span>{" "}
            <span className="text-muted-foreground">{member.lookingFor}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {instagram ? (
            <a
              href={instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Camera className="size-4" /> Instagram
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-1.5 text-sm text-muted-foreground/50">
              <Camera className="size-4" /> {isNoAccountValue(member.instagramUrl) ? "No Instagram Account" : "Not Connected"}
            </span>
          )}

          {tiktok ? (
            <a
              href={tiktok}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Music2 className="size-4" /> TikTok
            </a>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-1.5 text-sm text-muted-foreground/50">
              <Music2 className="size-4" /> {isNoAccountValue(member.tiktokUrl) ? "No TikTok Account" : "Not Connected"}
            </span>
          )}

          {optionalLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                <Icon className="size-4" /> {link.label}
              </a>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
