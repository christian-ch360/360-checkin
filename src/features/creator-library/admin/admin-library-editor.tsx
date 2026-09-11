"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import type { ContentCategory } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatCompactNumber } from "@/lib/utils/format";
import { contentCategoryValues, CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import {
  saveCreatorLibraryProfile,
  uploadCreatorLibraryPortrait,
} from "@/features/creator-library/services/creator-library-admin.actions";
import type { AdminCreatorEditor } from "@/features/creator-library/services/creator-library-admin.service";

type FormState = {
  visible: boolean;
  featured: boolean;
  displayOrder: string;
  headline: string;
  libraryBio: string;
  categories: ContentCategory[];
  imageUrl: string;
  name: string;
  email: string;
  phone: string;
  usernameHandle: string;
  companyName: string;
  instagramUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  websiteUrl: string;
  country: string;
  state: string;
  city: string;
  instagramFollowers: string;
  tiktokFollowers: string;
  youtubeSubscribers: string;
};

function toForm(data: AdminCreatorEditor): FormState {
  const p = data.profile;
  return {
    visible: p.visible,
    featured: p.featured,
    displayOrder: p.displayOrder != null ? String(p.displayOrder) : "",
    headline: p.headline ?? "",
    libraryBio: p.libraryBio ?? "",
    categories: p.categories.length ? p.categories : data.memberCategories,
    imageUrl: p.imageUrl ?? "",
    name: p.name ?? "",
    email: p.email ?? "",
    phone: p.phone ?? "",
    usernameHandle: p.usernameHandle ?? "",
    companyName: p.companyName ?? "",
    instagramUrl: p.instagramUrl ?? "",
    tiktokUrl: p.tiktokUrl ?? "",
    youtubeUrl: p.youtubeUrl ?? "",
    websiteUrl: p.websiteUrl ?? "",
    country: p.country ?? "",
    state: p.state ?? "",
    city: p.city ?? "",
    instagramFollowers: p.instagramFollowers != null ? String(p.instagramFollowers) : "",
    tiktokFollowers: p.tiktokFollowers != null ? String(p.tiktokFollowers) : "",
    youtubeSubscribers: p.youtubeSubscribers != null ? String(p.youtubeSubscribers) : "",
  };
}

export function AdminLibraryEditor({ data }: { data: AdminCreatorEditor }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => toForm(data));
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleCategory(category: ContentCategory) {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((entry) => entry !== category)
        : [...prev.categories, category],
    }));
  }

  function handleUpload(file: File) {
    setUploading(true);
    const body = new FormData();
    body.set("file", file);
    uploadCreatorLibraryPortrait(data.profileId, body)
      .then((result) => {
        if (result.success) {
          set("imageUrl", result.imageUrl);
          toast.success("Portrait uploaded.");
        } else {
          toast.error(result.error);
        }
      })
      .finally(() => setUploading(false));
  }

  function save() {
    startTransition(async () => {
      const result = await saveCreatorLibraryProfile(data.profileId, {
        visible: form.visible,
        featured: form.featured,
        displayOrder: form.displayOrder,
        headline: form.headline,
        libraryBio: form.libraryBio,
        categories: form.categories,
        imageUrl: form.imageUrl || null,
        name: form.name || null,
        email: form.email || null,
        phone: form.phone || null,
        usernameHandle: form.usernameHandle || null,
        companyName: form.companyName || null,
        instagramUrl: form.instagramUrl || null,
        tiktokUrl: form.tiktokUrl || null,
        youtubeUrl: form.youtubeUrl || null,
        websiteUrl: form.websiteUrl || null,
        country: form.country || null,
        state: form.state || null,
        city: form.city || null,
        instagramFollowers: form.instagramFollowers,
        tiktokFollowers: form.tiktokFollowers,
        youtubeSubscribers: form.youtubeSubscribers,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Library profile saved.");
      router.push("/admin/creator-library");
      router.refresh();
    });
  }

  const syncedHint = (value: number | null) =>
    value != null ? `Synced: ${formatCompactNumber(value)}` : "No synced value";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.displayName ?? data.fullName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.standalone
            ? "Imported creator with no linked CreatorHub360 member — identity fields below are the source of truth."
            : "Linked to a CreatorHub360 member. Blank fields fall back to that member; the member's own profile is never changed here."}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Published to the library</p>
                <p className="text-xs text-muted-foreground">Only published creators appear at /creator-library.</p>
              </div>
              <Switch checked={form.visible} onCheckedChange={(value) => set("visible", value)} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Featured</p>
                <p className="text-xs text-muted-foreground">Requires the creator to be published.</p>
              </div>
              <Switch checked={form.featured} disabled={!form.visible} onCheckedChange={(value) => set("featured", value)} />
            </div>

            {form.featured ? (
              <div className="space-y-1.5">
                <Label htmlFor="displayOrder">Featured order</Label>
                <Input
                  id="displayOrder"
                  inputMode="numeric"
                  value={form.displayOrder}
                  onChange={(event) => set("displayOrder", event.target.value)}
                  placeholder="Lower shows first (optional)"
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Portrait</Label>
              <div className="flex items-center gap-3">
                <div className="size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {(form.imageUrl || data.memberProfilePhotoUrl) && (
                    // eslint-disable-next-line @next/next/no-img-element -- remote URL preview
                    <img src={form.imageUrl || data.memberProfilePhotoUrl || ""} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                    Upload image
                  </Button>
                  {form.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => set("imageUrl", "")}
                      className="block text-xs text-muted-foreground hover:text-foreground"
                    >
                      Remove image
                    </button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Falls back to a branded CH360 placeholder.</p>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleUpload(file);
                    event.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Follower counts</Label>
              <p className="text-xs text-muted-foreground">Blank uses the synced number for that platform, if any.</p>
              {(
                [
                  ["instagramFollowers", "Instagram", data.syncedFollowers.instagram],
                  ["tiktokFollowers", "TikTok", data.syncedFollowers.tiktok],
                  ["youtubeSubscribers", "YouTube", data.syncedFollowers.youtube],
                ] as const
              ).map(([key, label, synced]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 text-sm">{label}</span>
                  <Input
                    inputMode="numeric"
                    value={form[key]}
                    onChange={(event) => set(key, event.target.value)}
                    placeholder={synced != null ? formatCompactNumber(synced) : "—"}
                  />
                  <span className="w-28 shrink-0 text-right text-xs text-muted-foreground">{syncedHint(synced)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            {data.standalone ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" value={form.name} onChange={(v) => set("name", v)} className="col-span-2" />
                <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
                <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
                <Field label="Username" value={form.usernameHandle} onChange={(v) => set("usernameHandle", v)} />
                <Field label="Company" value={form.companyName} onChange={(v) => set("companyName", v)} />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3">
              <Field label="Instagram URL" value={form.instagramUrl} onChange={(v) => set("instagramUrl", v)} />
              <Field label="TikTok URL" value={form.tiktokUrl} onChange={(v) => set("tiktokUrl", v)} />
              <Field label="YouTube URL" value={form.youtubeUrl} onChange={(v) => set("youtubeUrl", v)} />
              <Field label="Website" value={form.websiteUrl} onChange={(v) => set("websiteUrl", v)} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Country" value={form.country} onChange={(v) => set("country", v)} placeholder="United States" />
              <Field label="State" value={form.state} onChange={(v) => set("state", v)} placeholder="California" />
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} placeholder="Los Angeles" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="headline">Card headline</Label>
              <Input
                id="headline"
                value={form.headline}
                onChange={(event) => set("headline", event.target.value)}
                placeholder="Short tagline for the card"
                maxLength={160}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="libraryBio">About</Label>
              <Textarea
                id="libraryBio"
                value={form.libraryBio}
                onChange={(event) => set("libraryBio", event.target.value)}
                placeholder={data.memberBio ?? "About this creator"}
                rows={4}
                maxLength={2000}
              />
            </div>

            <div className="space-y-2">
              <Label>Categories</Label>
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                {contentCategoryValues.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      form.categories.includes(category)
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {CONTENT_CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-4 flex items-center justify-end gap-2 rounded-xl border border-border bg-background/90 p-3 backdrop-blur">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/creator-library")}>
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Save profile
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}
