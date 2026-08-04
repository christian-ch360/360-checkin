"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Link2 } from "lucide-react";
import { format } from "date-fns";
import type { ContentCategory } from "@prisma/client";
import { settingsProfileSchema, type SettingsProfileInput } from "@/features/settings/schemas/settings.schema";
import { updateSettingsProfile } from "@/features/settings/services/actions";
import { useSettingsFormDirty } from "@/features/settings/hooks/use-settings-form-dirty";
import { calculateProfileCompletion } from "@/features/settings/lib/profile-completion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";
import { MemberAvatarUpload } from "@/features/members/components/member-avatar-upload";
import { ContentCategoryPicker } from "@/features/members/components/content-category-picker";
import { formatCompactNumber } from "@/lib/utils/format";
import type { getConnectionsForMember } from "@/features/integrations/services/social-connections.service";

type Connections = Awaited<ReturnType<typeof getConnectionsForMember>>;

export function ProfileSection({
  id,
  fullName,
  email,
  phone,
  website,
  bio,
  location,
  profilePhotoUrl,
  skills,
  contentCategories,
  lookingFor,
  instagramUrl,
  tiktokUrl,
  youtubeUrl,
  linkedinUrl,
  availableForCollab,
  visibleInDirectory,
  memberNumber,
  role,
  organizationName,
  memberSince,
  connections,
  // Not editable here (that lives on /profile's richer identity editor) —
  // still needs to round-trip through this form's submit so saving Settings
  // doesn't null out what was set on the Profile page.
  username,
  displayName,
  bannerImageUrl,
}: {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  website: string | null;
  bio: string | null;
  location: string | null;
  profilePhotoUrl: string | null;
  skills: string[];
  contentCategories: ContentCategory[];
  lookingFor: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  linkedinUrl: string | null;
  availableForCollab: boolean;
  visibleInDirectory: boolean;
  memberNumber: string;
  role: string;
  organizationName: string;
  memberSince: Date;
  connections: Connections;
  username: string | null;
  displayName: string | null;
  bannerImageUrl: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SettingsProfileInput>({
    resolver: zodResolver(settingsProfileSchema),
    defaultValues: {
      fullName,
      phone: phone ?? "",
      website: website ?? "",
      location: location ?? "",
      bio: bio ?? "",
      profilePhotoUrl: profilePhotoUrl ?? "",
      skills: skills.join(", "),
      contentCategories,
      lookingFor: lookingFor ?? "",
      instagramUrl: instagramUrl ?? "",
      tiktokUrl: tiktokUrl ?? "",
      youtubeUrl: youtubeUrl ?? "",
      linkedinUrl: linkedinUrl ?? "",
      availableForCollab,
      visibleInDirectory,
      username: username ?? "",
      displayName: displayName ?? "",
      bannerImageUrl: bannerImageUrl ?? "",
    },
  });

  useSettingsFormDirty(form.formState.isDirty);

  const hasConnectedPlatform = connections.some((c) => c.status === "CONNECTED");
  const hasSocialLink = Boolean(instagramUrl || tiktokUrl || youtubeUrl || linkedinUrl);
  const completion = calculateProfileCompletion({
    profilePhotoUrl,
    bio,
    website,
    phone,
    location,
    contentCategoriesCount: contentCategories.length,
    skillsCount: skills.length,
    hasSocialLink,
    hasConnectedPlatform,
  });

  function onSubmit(values: SettingsProfileInput) {
    startTransition(async () => {
      const result = await updateSettingsProfile(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated");
      form.reset(values);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <SettingsSectionCard id="profile" title="Profile completion" description="A quick signal of how filled-out your profile is.">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{completion}% complete</span>
            {completion < 100 && <span className="text-xs text-muted-foreground">Fill in every field for full visibility</span>}
          </div>
          <Progress value={completion} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Profile" description="Your personal details across CreatorHub360.">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center gap-4">
              <MemberAvatarUpload memberId={id} currentUrl={profilePhotoUrl} fullName={fullName} canEdit size={64} />
              <p className="text-sm text-muted-foreground">Click your photo to upload a new one.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input value={email} disabled readOnly />
                </FormControl>
                <p className="text-xs text-muted-foreground">Change this from the Change Email tab.</p>
              </FormItem>
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone number</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://yoursite.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Los Angeles, CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A little about you" className="min-h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentCategories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content categories</FormLabel>
                  <FormControl>
                    <ContentCategoryPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-x-4 gap-y-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Member ID</p>
                <p className="font-medium">{memberNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role</p>
                <p className="font-medium capitalize">{role.toLowerCase().replaceAll("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Organization</p>
                <p className="font-medium">{organizationName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Join date</p>
                <p className="font-medium">{format(memberSince, "MMM d, yyyy")}</p>
              </div>
            </div>

            <div className="space-y-5 border-t pt-6">
              <div>
                <p className="text-sm font-medium">Collaboration preferences</p>
                <p className="text-xs text-muted-foreground">Shown to other members browsing the Collab Hub directory.</p>
              </div>

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills</FormLabel>
                    <FormControl>
                      <Input placeholder="Video editing, Photography, Copywriting" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Comma-separated.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lookingFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Looking for</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What kind of collaborations are you looking for?" className="min-h-20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="instagramUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Link2 className="size-3.5" /> Instagram
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tiktokUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TikTok</FormLabel>
                      <FormControl>
                        <Input placeholder="https://tiktok.com/@..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="youtubeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Link2 className="size-3.5" /> YouTube
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://youtube.com/@..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Link2 className="size-3.5" /> LinkedIn
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {connections.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Follower counts</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {connections
                      .filter((c) => c.status === "CONNECTED")
                      .map((c) => (
                        <div key={c.platform} className="rounded-xl border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">{c.label}</p>
                          <p className="text-sm font-semibold">
                            {c.followerCount != null ? formatCompactNumber(c.followerCount) : "—"}
                          </p>
                        </div>
                      ))}
                    {!hasConnectedPlatform && (
                      <p className="col-span-full text-xs text-muted-foreground">
                        Connect a platform in Profile → Integrations to show follower counts here.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="availableForCollab"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                    <div>
                      <FormLabel>Available for collab</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Shows an &ldquo;open to work&rdquo; signal on your directory card.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visibleInDirectory"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                    <div>
                      <FormLabel>Visible in directory</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Turn off to hide your profile from the Collab Hub directory entirely.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </Form>
      </SettingsSectionCard>
    </div>
  );
}
