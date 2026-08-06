"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { contentCategoryValues, CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { SOCIAL_META } from "@/features/integrations/config/social-meta";
import type { SocialPlatform } from "@prisma/client";

const PLATFORMS: SocialPlatform[] = ["INSTAGRAM", "TIKTOK", "YOUTUBE"];

const FOLLOWER_RANGES = [
  { value: "1000", label: "1K+" },
  { value: "10000", label: "10K+" },
  { value: "100000", label: "100K+" },
  { value: "1000000", label: "1M+" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "largestAudience", label: "Largest audience" },
  { value: "highestInstagram", label: "Highest Instagram followers" },
  { value: "highestTikTok", label: "Highest TikTok followers" },
  { value: "highestYoutube", label: "Highest YouTube subscribers" },
  { value: "fastestGrowth", label: "Fastest monthly growth" },
  { value: "recentlyJoined", label: "Recently joined" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "recentlySynced", label: "Recently synced" },
];

export function CollabFilters({ skills }: { skills: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [location, setLocation] = useState(searchParams.get("location") ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("search", search);
      else params.delete("search");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (location) params.set("location", location);
      else params.delete("location");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all" || !value) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function togglePlatform(platform: SocialPlatform) {
    const current = new Set((searchParams.get("platforms") ?? "").split(",").filter(Boolean));
    if (current.has(platform)) current.delete(platform);
    else current.add(platform);
    setParam("platforms", Array.from(current).join(","));
  }

  const activePlatforms = new Set((searchParams.get("platforms") ?? "").split(",").filter(Boolean));
  const availableOnly = searchParams.get("available") === "1";
  const verifiedOnly = searchParams.get("verified") === "1";
  const recentlySyncedOnly = searchParams.get("recentlySynced") === "1";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, bio, socials, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={searchParams.get("role") ?? "all"} onValueChange={(v) => setParam("role", v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {skills.length > 0 && (
          <Select value={searchParams.get("skill") ?? "all"} onValueChange={(v) => setParam("skill", v)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All skills</SelectItem>
              {skills.map((skill) => (
                <SelectItem key={skill} value={skill}>
                  {skill}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={searchParams.get("category") ?? "all"} onValueChange={(v) => setParam("category", v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {contentCategoryValues.map((category) => (
              <SelectItem key={category} value={category}>
                {CONTENT_CATEGORY_LABELS[category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative w-36">
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <Select value={searchParams.get("sort") ?? "all"} onValueChange={(v) => setParam("sort", v)}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Default order</SelectItem>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PLATFORMS.map((platform) => {
          const active = activePlatforms.has(platform);
          return (
            <Badge
              key={platform}
              variant="outline"
              role="button"
              tabIndex={0}
              onClick={() => togglePlatform(platform)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  togglePlatform(platform);
                }
              }}
              className={cn(
                "cursor-pointer select-none py-1.5",
                active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
              )}
            >
              {SOCIAL_META[platform].label} connected
            </Badge>
          );
        })}

        <Select value={searchParams.get("minFollowers") ?? "all"} onValueChange={(v) => setParam("minFollowers", v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Followers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any audience</SelectItem>
            {FOLLOWER_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
          <Switch
            id="available-only"
            checked={availableOnly}
            onCheckedChange={(checked) => setParam("available", checked ? "1" : "")}
          />
          <Label htmlFor="available-only" className="text-sm font-normal text-muted-foreground">
            Open to collab only
          </Label>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
          <Switch
            id="verified-only"
            checked={verifiedOnly}
            onCheckedChange={(checked) => setParam("verified", checked ? "1" : "")}
          />
          <Label htmlFor="verified-only" className="text-sm font-normal text-muted-foreground">
            Verified creators
          </Label>
        </div>
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
          <Switch
            id="recently-synced"
            checked={recentlySyncedOnly}
            onCheckedChange={(checked) => setParam("recentlySynced", checked ? "1" : "")}
          />
          <Label htmlFor="recently-synced" className="text-sm font-normal text-muted-foreground">
            Recently synced
          </Label>
        </div>
      </div>
    </div>
  );
}
