"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { KioskDecorativeElement } from "@prisma/client";
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
import { isThemeScheduledNow } from "@/features/kiosk/config/kiosk-schedule";
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
import { DEVICE_SIZES } from "@/features/kiosk/components/admin/theme-editor/device-preview-switcher";
import { ThemeEditorShell } from "@/features/kiosk/components/admin/theme-editor/theme-editor-shell";
import type { ThemeEditorContext } from "@/features/kiosk/components/admin/theme-editor/section-registry";
import type { EditableThemeVersion, FormState, Sponsor, ThemeColor } from "@/features/kiosk/components/admin/theme-editor/types";

export type { EditableThemeVersion } from "@/features/kiosk/components/admin/theme-editor/types";

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
  kioskName,
  kioskLocation,
}: {
  themeKey?: string;
  latest?: EditableThemeVersion | null;
  versionHistory?: EditableThemeVersion[];
  events: { id: string; title: string }[];
  /** Same values /kiosk/page.tsx passes into KioskApp — read server-side (KIOSK_NAME/KIOSK_LOCATION
   * is a server-only module) by the page and threaded down so the preview panel mounts the real
   * KioskApp with the org's actual kiosk name/location instead of a placeholder. */
  kioskName: string;
  kioskLocation: string | null;
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

  const context: ThemeEditorContext = {
    form,
    update,
    events,
    themeKey,
    latest,
    versionHistory,
    isPending,
    addSponsor,
    updateSponsor,
    removeSponsor,
    addThemeColor,
    updateThemeColor,
    removeThemeColor,
    toggleDecorativeElement,
    onRollbackRequest: setRollbackTarget,
    onTogglePinnedLive: handleTogglePinnedLive,
  };

  return (
    <>
      <ThemeEditorShell
        context={context}
        themeName={form.name}
        isPending={isPending}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onDuplicate={handleDuplicate}
        onDeleteRequest={() => setDeleteConfirmOpen(true)}
        previewTheme={previewTheme}
        device={device}
        onDeviceChange={setDevice}
        previewAsLive={previewAsLive}
        onPreviewAsLiveChange={setPreviewAsLive}
        wouldBeLive={wouldBeLive}
        kioskName={kioskName}
        kioskLocation={kioskLocation}
      />

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
    </>
  );
}
