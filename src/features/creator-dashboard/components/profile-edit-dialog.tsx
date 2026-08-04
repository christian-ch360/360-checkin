"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil, Link2 } from "lucide-react";
import type { ContentCategory } from "@prisma/client";
import { profileSchema, collabProfileSchema } from "@/features/settings/schemas/settings.schema";
import { updateOwnProfile, updateCollabProfile } from "@/features/settings/services/actions";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ContentCategoryPicker } from "@/features/members/components/content-category-picker";

const editProfileSchema = profileSchema.merge(collabProfileSchema);
type EditProfileInput = z.infer<typeof editProfileSchema>;

type ProfileDefaults = {
  fullName: string;
  username: string | null;
  displayName: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  bannerImageUrl: string | null;
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

export function ProfileEditDialog({ profile }: { profile: ProfileDefaults }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const form = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      fullName: profile.fullName,
      username: profile.username ?? "",
      displayName: profile.displayName ?? "",
      phone: profile.phone ?? "",
      website: profile.website ?? "",
      location: profile.location ?? "",
      bio: profile.bio ?? "",
      profilePhotoUrl: profile.profilePhotoUrl ?? "",
      bannerImageUrl: profile.bannerImageUrl ?? "",
      skills: profile.skills.join(", "),
      contentCategories: profile.contentCategories,
      lookingFor: profile.lookingFor ?? "",
      instagramUrl: profile.instagramUrl ?? "",
      tiktokUrl: profile.tiktokUrl ?? "",
      youtubeUrl: profile.youtubeUrl ?? "",
      linkedinUrl: profile.linkedinUrl ?? "",
      availableForCollab: profile.availableForCollab,
      visibleInDirectory: profile.visibleInDirectory,
    },
  });

  function onSubmit(values: EditProfileInput) {
    startTransition(async () => {
      const [profileResult, collabResult] = await Promise.all([
        updateOwnProfile(values),
        updateCollabProfile(values),
      ]);
      const failed = !profileResult.success ? profileResult : !collabResult.success ? collabResult : null;
      if (failed) {
        toast.error(failed.error);
        return;
      }
      toast.success("Profile updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5" /> Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>This is what other members see across CreatorHub360.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bannerImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banner image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Your profile photo is set from the camera icon on your avatar.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display name</FormLabel>
                    <FormControl>
                      <Input placeholder={profile.fullName} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="janecreator" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell people what you create." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="contentCategories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content categories</FormLabel>
                  <FormControl>
                    <ContentCategoryPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Select what best describes the content you create.</p>
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

            <FormField
              control={form.control}
              name="availableForCollab"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4">
                  <div>
                    <FormLabel>Open for collaborations</FormLabel>
                    <p className="text-xs text-muted-foreground">Shows an &ldquo;open to work&rdquo; signal on your profile.</p>
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
                    <p className="text-xs text-muted-foreground">Turn off to hide your profile from the Collab Hub directory.</p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:rounded-none max-sm:bg-card/95 max-sm:backdrop-blur">
              <Button type="submit" disabled={isPending} className="w-full max-sm:h-12 max-sm:text-base">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
