"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Rocket,
  History,
  Smartphone,
  Tablet,
  Monitor,
  MonitorSmartphone,
  Copy,
  Pin,
  PinOff,
} from "lucide-react";
import type { KioskAnimationStyle, KioskButtonStyle, KioskDecorativeElement, KioskLogoVariant, KioskRecurrence } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { HomeScreen } from "@/features/kiosk/components/home-screen";
import { isThemeScheduledNow } from "@/features/kiosk/config/kiosk-schedule";
import { KIOSK_DECORATIVE_ELEMENT_VALUES, KIOSK_DECORATIVE_ELEMENTS } from "@/features/kiosk/config/kiosk-decorative-elements.config";
import {
  saveThemeDraftAction,
  createThemeAction,
  publishThemeAction,
  rollbackThemeAction,
  duplicateThemeAction,
  deleteThemeAction,
  setThemePinnedLiveAction,
} from "@/features/kiosk/services/kiosk-theme-actions";
import type { KioskThemeInput } from "@/features/kiosk/services/kiosk-theme.service";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const DEVICE_SIZES: Record<string, { width: string; icon: typeof Monitor; label: string }> = {
  desktop: { width: "100%", icon: Monitor, label: "Desktop" },
  tablet: { width: "768px", icon: Tablet, label: "Tablet" },
  kiosk: { width: "480px", icon: MonitorSmartphone, label: "Kiosk" },
  mobile: { width: "375px", icon: Smartphone, label: "Mobile" },
};

type Sponsor = { name: string; logoUrl: string; message?: string; ctaLabel?: string; ctaLink?: string };
type ThemeColor = { name: string; hex: string };

type FormState = {
  name: string;
  headline: string;
  subheadline: string;
  location: string;
  backgroundImageUrl: string;
  backgroundVideoUrl: string;
  logoOverrideUrl: string;
  logoVariant: KioskLogoVariant;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  buttonColor: string;
  buttonTextColor: string;
  buttonStyle: KioskButtonStyle;
  textColor: string;
  animationStyle: KioskAnimationStyle;
  themeColors: ThemeColor[];
  decorativeElements: KioskDecorativeElement[];
  ctaLabel: string;
  ctaLink: string;
  showQrRegistration: boolean;
  featuredEventTitle: string;
  featuredEventTags: string;
  promoBannerText: string;
  promoBannerLink: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  recurrence: KioskRecurrence;
  recurrenceDaysOfWeek: number[];
  recurrenceNthWeek: string;
  recurrenceWeekday: string;
  showCountdown: boolean;
  eventId: string;
  sponsors: Sponsor[];
};

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultForm(): FormState {
  const today = toDateInput(new Date());
  return {
    name: "",
    headline: "",
    subheadline: "",
    location: "",
    backgroundImageUrl: "",
    backgroundVideoUrl: "",
    logoOverrideUrl: "",
    logoVariant: "DEFAULT",
    primaryColor: "",
    secondaryColor: "",
    accentColor: "",
    buttonColor: "",
    buttonTextColor: "",
    buttonStyle: "SOLID",
    textColor: "",
    animationStyle: "FADE",
    themeColors: [],
    decorativeElements: [],
    ctaLabel: "",
    ctaLink: "",
    showQrRegistration: false,
    featuredEventTitle: "",
    featuredEventTags: "",
    promoBannerText: "",
    promoBannerLink: "",
    startDate: today,
    endDate: today,
    startTime: "",
    endTime: "",
    recurrence: "NONE",
    recurrenceDaysOfWeek: [],
    recurrenceNthWeek: "",
    recurrenceWeekday: "",
    showCountdown: false,
    eventId: "",
    sponsors: [],
  };
}

export type EditableThemeVersion = {
  id: string;
  version: number;
  status: string;
  isDefault: boolean;
  isPinnedLive: boolean;
  name: string;
  headline: string;
  subheadline: string | null;
  location: string | null;
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
  logoOverrideUrl: string | null;
  logoVariant: KioskLogoVariant;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  buttonColor: string | null;
  buttonTextColor: string | null;
  buttonStyle: KioskButtonStyle;
  textColor: string | null;
  animationStyle: KioskAnimationStyle;
  themeColors: unknown;
  decorativeElements: KioskDecorativeElement[];
  ctaLabel: string | null;
  ctaLink: string | null;
  showQrRegistration: boolean;
  featuredEventTitle: string | null;
  featuredEventTags: string[];
  promoBannerText: string | null;
  promoBannerLink: string | null;
  startDate: Date;
  endDate: Date;
  startTime: string | null;
  endTime: string | null;
  recurrence: KioskRecurrence;
  recurrenceDaysOfWeek: number[];
  recurrenceNthWeek: number | null;
  recurrenceWeekday: number | null;
  showCountdown: boolean;
  eventId: string | null;
  sponsors: unknown;
  publishedAt: Date | null;
};

function fromVersion(v: EditableThemeVersion): FormState {
  return {
    name: v.name,
    headline: v.headline,
    subheadline: v.subheadline ?? "",
    location: v.location ?? "",
    backgroundImageUrl: v.backgroundImageUrl ?? "",
    backgroundVideoUrl: v.backgroundVideoUrl ?? "",
    logoOverrideUrl: v.logoOverrideUrl ?? "",
    logoVariant: v.logoVariant,
    primaryColor: v.primaryColor ?? "",
    secondaryColor: v.secondaryColor ?? "",
    accentColor: v.accentColor ?? "",
    buttonColor: v.buttonColor ?? "",
    buttonTextColor: v.buttonTextColor ?? "",
    buttonStyle: v.buttonStyle,
    textColor: v.textColor ?? "",
    animationStyle: v.animationStyle,
    themeColors: Array.isArray(v.themeColors) ? (v.themeColors as ThemeColor[]) : [],
    decorativeElements: v.decorativeElements,
    ctaLabel: v.ctaLabel ?? "",
    ctaLink: v.ctaLink ?? "",
    showQrRegistration: v.showQrRegistration,
    featuredEventTitle: v.featuredEventTitle ?? "",
    featuredEventTags: v.featuredEventTags.join(", "),
    promoBannerText: v.promoBannerText ?? "",
    promoBannerLink: v.promoBannerLink ?? "",
    startDate: toDateInput(v.startDate),
    endDate: toDateInput(v.endDate),
    startTime: v.startTime ?? "",
    endTime: v.endTime ?? "",
    recurrence: v.recurrence,
    recurrenceDaysOfWeek: v.recurrenceDaysOfWeek,
    recurrenceNthWeek: v.recurrenceNthWeek ? String(v.recurrenceNthWeek) : "",
    recurrenceWeekday: v.recurrenceWeekday != null ? String(v.recurrenceWeekday) : "",
    showCountdown: v.showCountdown,
    eventId: v.eventId ?? "",
    sponsors: Array.isArray(v.sponsors) ? (v.sponsors as Sponsor[]) : [],
  };
}

export function KioskThemeEditor({
  themeKey,
  latest,
  versionHistory,
  events,
}: {
  themeKey?: string;
  latest?: EditableThemeVersion | null;
  versionHistory?: EditableThemeVersion[];
  events: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(latest ? fromVersion(latest) : defaultForm());
  const [isPending, startTransition] = useTransition();
  const [device, setDevice] = useState<keyof typeof DEVICE_SIZES>("kiosk");
  const [previewAsLive, setPreviewAsLive] = useState("");
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toInput(): KioskThemeInput {
    return {
      name: form.name,
      headline: form.headline,
      subheadline: form.subheadline || null,
      location: form.location || null,
      backgroundImageUrl: form.backgroundImageUrl || null,
      backgroundVideoUrl: form.backgroundVideoUrl || null,
      logoOverrideUrl: form.logoOverrideUrl || null,
      logoVariant: form.logoVariant,
      primaryColor: form.primaryColor || null,
      secondaryColor: form.secondaryColor || null,
      accentColor: form.accentColor || null,
      buttonColor: form.buttonColor || null,
      buttonTextColor: form.buttonTextColor || null,
      buttonStyle: form.buttonStyle,
      textColor: form.textColor || null,
      animationStyle: form.animationStyle,
      themeColors: form.themeColors.length > 0 ? form.themeColors : null,
      decorativeElements: form.decorativeElements,
      ctaLabel: form.ctaLabel || null,
      ctaLink: form.ctaLink || null,
      showQrRegistration: form.showQrRegistration,
      featuredEventTitle: form.featuredEventTitle || null,
      featuredEventTags: form.featuredEventTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      promoBannerText: form.promoBannerText || null,
      promoBannerLink: form.promoBannerLink || null,
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      recurrence: form.recurrence,
      recurrenceDaysOfWeek: form.recurrenceDaysOfWeek,
      recurrenceNthWeek: form.recurrenceNthWeek ? Number.parseInt(form.recurrenceNthWeek, 10) : null,
      recurrenceWeekday: form.recurrenceWeekday !== "" ? Number.parseInt(form.recurrenceWeekday, 10) : null,
      showCountdown: form.showCountdown,
      eventId: form.eventId || null,
      sponsors: form.sponsors.length > 0 ? form.sponsors : null,
    };
  }

  function handleSaveDraft() {
    if (!form.name.trim() || !form.headline.trim()) {
      toast.error("Enter a theme name and headline.");
      return;
    }
    startTransition(async () => {
      const result = themeKey
        ? await saveThemeDraftAction(themeKey, toInput())
        : await createThemeAction(toInput());
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Draft saved.");
      router.push(`/admin/kiosk-manager/themes/${result.themeKey}`);
      router.refresh();
    });
  }

  function handlePublish() {
    if (!form.name.trim() || !form.headline.trim()) {
      toast.error("Enter a theme name and headline.");
      return;
    }
    startTransition(async () => {
      const draftResult = themeKey
        ? await saveThemeDraftAction(themeKey, toInput())
        : await createThemeAction(toInput());
      if (!draftResult.success) {
        toast.error(draftResult.error);
        return;
      }
      const publishResult = await publishThemeAction(draftResult.themeKey);
      if (!publishResult.success) {
        toast.error(publishResult.error);
        return;
      }
      toast.success("Theme published.");
      router.push(`/admin/kiosk-manager/themes/${draftResult.themeKey}`);
      router.refresh();
    });
  }

  function handleRollback() {
    if (!themeKey || rollbackTarget == null) return;
    startTransition(async () => {
      const result = await rollbackThemeAction(themeKey, rollbackTarget);
      setRollbackTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Rolled back to version ${rollbackTarget} and published.`);
      router.refresh();
    });
  }

  function handleDuplicate() {
    if (!themeKey) return;
    startTransition(async () => {
      const result = await duplicateThemeAction(themeKey);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Theme duplicated.");
      router.push(`/admin/kiosk-manager/themes/${result.themeKey}`);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!themeKey) return;
    startTransition(async () => {
      const result = await deleteThemeAction(themeKey);
      setDeleteConfirmOpen(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Theme deleted.");
      router.push("/admin/kiosk-manager?tab=themes");
      router.refresh();
    });
  }

  function handleTogglePinnedLive() {
    if (!themeKey || !latest) return;
    const nextPinned = !latest.isPinnedLive;
    startTransition(async () => {
      const result = await setThemePinnedLiveAction(themeKey, nextPinned);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(nextPinned ? "Theme pinned live — overriding the schedule." : "Manual override cleared.");
      router.refresh();
    });
  }

  function addSponsor() {
    update("sponsors", [...form.sponsors, { name: "", logoUrl: "" }]);
  }
  function updateSponsor(index: number, patch: Partial<Sponsor>) {
    update(
      "sponsors",
      form.sponsors.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }
  function removeSponsor(index: number) {
    update(
      "sponsors",
      form.sponsors.filter((_, i) => i !== index)
    );
  }

  function addThemeColor() {
    update("themeColors", [...form.themeColors, { name: "", hex: "#000000" }]);
  }
  function updateThemeColor(index: number, patch: Partial<ThemeColor>) {
    update(
      "themeColors",
      form.themeColors.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  }
  function removeThemeColor(index: number) {
    update(
      "themeColors",
      form.themeColors.filter((_, i) => i !== index)
    );
  }

  function toggleDecorativeElement(key: KioskDecorativeElement) {
    update(
      "decorativeElements",
      form.decorativeElements.includes(key)
        ? form.decorativeElements.filter((k) => k !== key)
        : [...form.decorativeElements, key]
    );
  }

  const previewTheme = useMemo(
    () => ({
      id: "preview",
      themeKey: themeKey ?? "preview",
      version: 1,
      name: form.name || "Untitled Theme",
      headline: form.headline || "Your Headline Here",
      subheadline: form.subheadline || null,
      location: form.location || null,
      backgroundImageUrl: form.backgroundImageUrl || null,
      backgroundVideoUrl: form.backgroundVideoUrl || null,
      logoOverrideUrl: form.logoOverrideUrl || null,
      logoVariant: form.logoVariant,
      primaryColor: form.primaryColor || null,
      secondaryColor: form.secondaryColor || null,
      accentColor: form.accentColor || null,
      buttonColor: form.buttonColor || null,
      buttonTextColor: form.buttonTextColor || null,
      buttonStyle: form.buttonStyle,
      textColor: form.textColor || null,
      animationStyle: form.animationStyle,
      themeColors: form.themeColors,
      decorativeElements: form.decorativeElements,
      ctaLabel: form.ctaLabel || null,
      ctaLink: form.ctaLink || null,
      startDate: form.startDate ? new Date(form.startDate) : new Date(),
      endDate: form.endDate ? new Date(form.endDate) : new Date(),
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      showCountdown: form.showCountdown,
      sponsors: form.sponsors,
      isDefault: false,
      showQrRegistration: form.showQrRegistration,
      // The kiosk generates a real QR token from the linked Event server-side; the
      // editor's preview doesn't mint one, so the QR block simply won't render here
      // until the theme is saved with an event linked.
      qrToken: null,
      featuredEventTitle: form.featuredEventTitle || null,
      featuredEventTags: form.featuredEventTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      promoBannerText: form.promoBannerText || null,
      promoBannerLink: form.promoBannerLink || null,
    }),
    [form, themeKey]
  );

  const simulatedNow = previewAsLive ? new Date(previewAsLive) : new Date();
  const wouldBeLive = isThemeScheduledNow(
    {
      startDate: new Date(form.startDate),
      endDate: new Date(form.endDate),
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      recurrence: form.recurrence,
      recurrenceDaysOfWeek: form.recurrenceDaysOfWeek,
      recurrenceNthWeek: form.recurrenceNthWeek ? Number.parseInt(form.recurrenceNthWeek, 10) : null,
      recurrenceWeekday: form.recurrenceWeekday !== "" ? Number.parseInt(form.recurrenceWeekday, 10) : null,
    },
    simulatedNow
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
      {/* Form */}
      <div className="space-y-6">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-name">Theme Name</Label>
              <Input id="theme-name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Whiskey Wednesday" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-headline">Hero Title</Label>
              <Input id="theme-headline" value={form.headline} onChange={(e) => update("headline", e.target.value)} placeholder="🥃 Whiskey Wednesday" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-subheadline">Hero Subtitle</Label>
              <Textarea id="theme-subheadline" rows={2} value={form.subheadline} onChange={(e) => update("subheadline", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-location">Location</Label>
              <Input id="theme-location" value={form.location} onChange={(e) => update("location", e.target.value)} placeholder="Main Lounge" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme-cta-label">Button Label</Label>
                <Input id="theme-cta-label" value={form.ctaLabel} onChange={(e) => update("ctaLabel", e.target.value)} placeholder="Reserve Your Spot" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-cta-link">Button Link</Label>
                <Input id="theme-cta-link" value={form.ctaLink} onChange={(e) => update("ctaLink", e.target.value)} />
              </div>
            </div>
            {events.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="theme-event">Use Event as Kiosk Theme (optional)</Label>
                <Select value={form.eventId || "none"} onValueChange={(v) => update("eventId", v === "none" ? "" : v)}>
                  <SelectTrigger id="theme-event">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None — use the fields above</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When linked, the kiosk reads the title, description, date, location, and banner live from the event —
                  no duplicate entry required.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Featured Event Card</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-featured-title">Featured Event Title</Label>
              <Input
                id="theme-featured-title"
                value={form.featuredEventTitle}
                onChange={(e) => update("featuredEventTitle", e.target.value)}
                placeholder="Holiday Creator Mixer"
              />
              <p className="text-xs text-muted-foreground">Date, time, and location come from Scheduling below.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-featured-tags">Event Tags (comma-separated)</Label>
              <Input
                id="theme-featured-tags"
                value={form.featuredEventTags}
                onChange={(e) => update("featuredEventTags", e.target.value)}
                placeholder="Free for Members, Costume Contest, Live DJ"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">QR Registration Button</p>
                <p className="text-xs text-muted-foreground">Shows a scannable QR code linking to the selected event&rsquo;s check-in/registration.</p>
              </div>
              <Switch checked={form.showQrRegistration} onCheckedChange={(v) => update("showQrRegistration", v)} disabled={!form.eventId} />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Promotion Banner</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="theme-promo-text">Banner Text</Label>
              <Input id="theme-promo-text" value={form.promoBannerText} onChange={(e) => update("promoBannerText", e.target.value)} placeholder="Free gift with your first visit this week!" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="theme-promo-link">Banner Link (optional)</Label>
              <Input id="theme-promo-link" value={form.promoBannerLink} onChange={(e) => update("promoBannerLink", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme-bg">Background Image URL</Label>
              <Input id="theme-bg" value={form.backgroundImageUrl} onChange={(e) => update("backgroundImageUrl", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="theme-bg-video">Background Video URL (optional)</Label>
              <Input id="theme-bg-video" value={form.backgroundVideoUrl} onChange={(e) => update("backgroundVideoUrl", e.target.value)} />
              <p className="text-xs text-muted-foreground">Plays muted &amp; looping behind the hero; the background image is used as its poster frame.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme-logo-variant">Logo Variant</Label>
                <Select value={form.logoVariant} onValueChange={(v) => update("logoVariant", v as KioskLogoVariant)}>
                  <SelectTrigger id="theme-logo-variant">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEFAULT">Default (none in hero)</SelectItem>
                    <SelectItem value="LIGHT">Light mark</SelectItem>
                    <SelectItem value="DARK">Dark mark</SelectItem>
                    <SelectItem value="HIDDEN">Hidden</SelectItem>
                    <SelectItem value="CUSTOM">Custom image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.logoVariant === "CUSTOM" && (
                <div className="space-y-2">
                  <Label htmlFor="theme-logo">Logo Override URL</Label>
                  <Input id="theme-logo" value={form.logoOverrideUrl} onChange={(e) => update("logoOverrideUrl", e.target.value)} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="theme-primary">Primary Color</Label>
                <Input id="theme-primary" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} placeholder="#1b4332" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-secondary">Secondary Color</Label>
                <Input id="theme-secondary" value={form.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} placeholder="#d4af37" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-accent">Accent Color</Label>
                <Input id="theme-accent" value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)} placeholder="#b91c1c" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-button-color">Button Color</Label>
                <Input id="theme-button-color" value={form.buttonColor} onChange={(e) => update("buttonColor", e.target.value)} placeholder="#b45309" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-button-text-color">Button Text Color</Label>
                <Input id="theme-button-text-color" value={form.buttonTextColor} onChange={(e) => update("buttonTextColor", e.target.value)} placeholder="#ffffff" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-text-color">Text Color</Label>
                <Input id="theme-text-color" value={form.textColor} onChange={(e) => update("textColor", e.target.value)} placeholder="#000000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme-button-style">Button Style</Label>
                <Select value={form.buttonStyle} onValueChange={(v) => update("buttonStyle", v as KioskButtonStyle)}>
                  <SelectTrigger id="theme-button-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SOLID">Solid</SelectItem>
                    <SelectItem value="OUTLINE">Outline</SelectItem>
                    <SelectItem value="GLASS">Glass</SelectItem>
                    <SelectItem value="GRADIENT">Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-animation">Theme Animation</Label>
                <Select value={form.animationStyle} onValueChange={(v) => update("animationStyle", v as KioskAnimationStyle)}>
                  <SelectTrigger id="theme-animation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FADE">Fade</SelectItem>
                    <SelectItem value="SLIDE">Slide</SelectItem>
                    <SelectItem value="ZOOM">Zoom</SelectItem>
                    <SelectItem value="NONE">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Theme Colors</CardTitle>
            <Button size="sm" variant="outline" onClick={addThemeColor}>
              <Plus className="size-3.5" /> Add Color
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              A named palette (e.g. &ldquo;Forest Green&rdquo;) used to tint the decorative elements below — separate from the functional colors above.
            </p>
            {form.themeColors.map((color, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input placeholder="Snow White" value={color.name} onChange={(e) => updateThemeColor(i, { name: e.target.value })} />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(color.hex) ? color.hex : "#000000"}
                  onChange={(e) => updateThemeColor(i, { hex: e.target.value })}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-md border"
                />
                <Input className="w-28 shrink-0" value={color.hex} onChange={(e) => updateThemeColor(i, { hex: e.target.value })} />
                <Button size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => removeThemeColor(i)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Decorative Elements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {KIOSK_DECORATIVE_ELEMENT_VALUES.map((key) => {
                const def = KIOSK_DECORATIVE_ELEMENTS[key];
                const active = form.decorativeElements.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDecorativeElement(key)}
                    className={`flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                  >
                    <span className="text-sm font-medium">{def.label}</span>
                    <span className="text-xs text-muted-foreground">{def.description}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="theme-start-date">Theme Start Date</Label>
                <Input id="theme-start-date" type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-end-date">Theme End Date</Label>
                <Input id="theme-end-date" type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-start-time">Start Time (optional)</Label>
                <Input id="theme-start-time" type="time" value={form.startTime} onChange={(e) => update("startTime", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="theme-end-time">End Time (optional)</Label>
                <Input id="theme-end-time" type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-recurrence">Recurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => update("recurrence", v as KioskRecurrence)}>
                <SelectTrigger id="theme-recurrence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">One-time (date range only)</SelectItem>
                  <SelectItem value="WEEKLY">Every week, on selected days</SelectItem>
                  <SelectItem value="MONTHLY_NTH_WEEKDAY">Nth weekday of the month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.recurrence === "WEEKLY" && (
              <div className="space-y-2">
                <Label>Days of Week</Label>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS.map((d) => {
                    const active = form.recurrenceDaysOfWeek.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() =>
                          update(
                            "recurrenceDaysOfWeek",
                            active ? form.recurrenceDaysOfWeek.filter((v) => v !== d.value) : [...form.recurrenceDaysOfWeek, d.value]
                          )
                        }
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Example: every Wednesday → Whiskey Wednesday.</p>
              </div>
            )}

            {form.recurrence === "MONTHLY_NTH_WEEKDAY" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme-nth-week">Occurrence</Label>
                  <Select value={form.recurrenceNthWeek || "1"} onValueChange={(v) => update("recurrenceNthWeek", v)}>
                    <SelectTrigger id="theme-nth-week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">First</SelectItem>
                      <SelectItem value="2">Second</SelectItem>
                      <SelectItem value="3">Third</SelectItem>
                      <SelectItem value="4">Fourth</SelectItem>
                      <SelectItem value="5">Last</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme-nth-weekday">Weekday</Label>
                  <Select value={form.recurrenceWeekday || "1"} onValueChange={(v) => update("recurrenceWeekday", v)}>
                    <SelectTrigger id="theme-nth-weekday">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d.value} value={String(d.value)}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="col-span-2 text-xs text-muted-foreground">Example: First Monday → Investor Pitch Day.</p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Countdown Timer</p>
                <p className="text-xs text-muted-foreground">Counts down to the start date/time on the kiosk hero.</p>
              </div>
              <Switch checked={form.showCountdown} onCheckedChange={(v) => update("showCountdown", v)} />
            </div>

            {latest && themeKey && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Manual Override</p>
                  <p className="text-xs text-muted-foreground">
                    {latest.isPinnedLive
                      ? "This theme is pinned live right now, overriding the automatic schedule."
                      : latest.status === "PUBLISHED"
                        ? "Force this theme live immediately, regardless of schedule."
                        : "Publish this theme first to enable manual override."}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={latest.isPinnedLive ? "default" : "outline"}
                  onClick={handleTogglePinnedLive}
                  disabled={isPending || latest.status !== "PUBLISHED"}
                >
                  {latest.isPinnedLive ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  {latest.isPinnedLive ? "Unpin" : "Force Live"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Sponsor Logos</CardTitle>
            <Button size="sm" variant="outline" onClick={addSponsor}>
              <Plus className="size-3.5" /> Add Sponsor
            </Button>
          </CardHeader>
          {form.sponsors.length > 0 && (
            <CardContent className="space-y-3">
              {form.sponsors.map((sponsor, i) => (
                <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-2">
                  <Input placeholder="Sponsor name" value={sponsor.name} onChange={(e) => updateSponsor(i, { name: e.target.value })} />
                  <Input placeholder="Logo URL" value={sponsor.logoUrl} onChange={(e) => updateSponsor(i, { logoUrl: e.target.value })} />
                  <Input
                    placeholder="Short message (optional)"
                    value={sponsor.message ?? ""}
                    onChange={(e) => updateSponsor(i, { message: e.target.value })}
                    className="sm:col-span-2"
                  />
                  <Input placeholder="CTA label (optional)" value={sponsor.ctaLabel ?? ""} onChange={(e) => updateSponsor(i, { ctaLabel: e.target.value })} />
                  <div className="flex gap-2">
                    <Input placeholder="CTA link (optional)" value={sponsor.ctaLink ?? ""} onChange={(e) => updateSponsor(i, { ctaLink: e.target.value })} />
                    <Button size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => removeSponsor(i)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {versionHistory && versionHistory.length > 1 && (
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Version History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {versionHistory.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">Version {v.version}</span>{" "}
                    <Badge variant="outline" className="ml-1">
                      {v.status}
                    </Badge>
                    {v.publishedAt && <span className="ml-2 text-xs text-muted-foreground">{format(v.publishedAt, "MMM d, yyyy h:mm a")}</span>}
                  </div>
                  {latest && v.version !== latest.version && (
                    <Button size="sm" variant="outline" onClick={() => setRollbackTarget(v.version)}>
                      Roll Back to This
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save Draft
          </Button>
          <Button onClick={handlePublish} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} Publish Now
          </Button>
          {themeKey && (
            <>
              <Button variant="outline" onClick={handleDuplicate} disabled={isPending}>
                <Copy className="size-4" /> Duplicate Theme
              </Button>
              <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirmOpen(true)} disabled={isPending}>
                <Trash2 className="size-4" /> Delete Theme
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="xl:sticky xl:top-6 xl:self-start">
        <Card className="border shadow-sm">
          <CardHeader className="space-y-3">
            <CardTitle className="text-sm font-semibold">Preview Theme</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(DEVICE_SIZES) as (keyof typeof DEVICE_SIZES)[]).map((key) => {
                const opt = DEVICE_SIZES[key];
                const Icon = opt.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDevice(key)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${device === key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  >
                    <Icon className="size-3.5" /> {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-as-live" className="text-xs">
                Preview as Live (simulate date &amp; time)
              </Label>
              <div className="flex items-center gap-2">
                <Input id="preview-as-live" type="datetime-local" value={previewAsLive} onChange={(e) => setPreviewAsLive(e.target.value)} className="text-xs" />
                <Badge variant="outline" className={wouldBeLive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "text-muted-foreground"}>
                  {wouldBeLive ? "Would be Live" : "Not scheduled"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border bg-white" style={{ width: "100%" }}>
              <div className="mx-auto overflow-hidden bg-gradient-to-b from-white via-white to-[#f8f8f8] p-6 transition-all" style={{ width: DEVICE_SIZES[device].width, maxWidth: "100%" }}>
                <HomeScreen
                  kioskName="CreatorHub360"
                  kioskLocation={null}
                  isEntrance
                  onCheckIn={() => {}}
                  onRegisterNow={() => {}}
                  theme={previewTheme}
                  announcements={[]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={rollbackTarget != null} onOpenChange={(open) => !open && setRollbackTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll back to version {rollbackTarget}?</AlertDialogTitle>
            <AlertDialogDescription>
              This creates a new published version with version {rollbackTarget}&apos;s content — nothing is deleted from history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Roll Back
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{form.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every version of this theme. This can&apos;t be undone — use Archive from the theme list instead if you might want it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive text-white hover:bg-destructive/90">
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
