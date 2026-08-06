import type { ReactNode } from "react";
import type { KioskDecorativeElement } from "@prisma/client";
import { BasicInfoSection } from "./sections/basic-info-section";
import { FeaturedEventSection } from "./sections/featured-event-section";
import { PromotionSection } from "./sections/promotion-section";
import { BrandingSection } from "./sections/branding-section";
import { ColorsSection } from "./sections/colors-section";
import { ThemePaletteSection } from "./sections/theme-palette-section";
import { EffectsSection } from "./sections/effects-section";
import { SchedulingSection } from "./sections/scheduling-section";
import { SponsorsSection } from "./sections/sponsors-section";
import { HistorySection } from "./sections/history-section";
import type { EditableThemeVersion, FormState, Sponsor, ThemeColor, UpdateFormField } from "./types";

/**
 * Everything a section panel could need, in one place. Each registry entry's
 * `render` destructures only what it actually uses — this lets the shell
 * stay a single `sections.find(...).render(ctx)` call instead of a
 * hardcoded switch, so a future section is "add one entry here" rather than
 * an editor-wide change.
 */
export type ThemeEditorContext = {
  form: FormState;
  update: UpdateFormField;
  events: { id: string; title: string }[];
  themeKey?: string;
  latest?: EditableThemeVersion | null;
  versionHistory?: EditableThemeVersion[];
  isPending: boolean;
  addSponsor: () => void;
  updateSponsor: (index: number, patch: Partial<Sponsor>) => void;
  removeSponsor: (index: number) => void;
  addThemeColor: () => void;
  updateThemeColor: (index: number, patch: Partial<ThemeColor>) => void;
  removeThemeColor: (index: number) => void;
  toggleDecorativeElement: (key: KioskDecorativeElement) => void;
  onRollbackRequest: (version: number) => void;
  onTogglePinnedLive: () => void;
};

export type ThemeEditorSectionDef = {
  id: string;
  group: string;
  groupLabel: string;
  label: string;
  /** Extra words the sidebar search matches against, beyond the label/group. */
  searchTerms: string[];
  render: (ctx: ThemeEditorContext) => ReactNode;
};

export const THEME_EDITOR_SECTIONS: ThemeEditorSectionDef[] = [
  {
    id: "basic-info",
    group: "content",
    groupLabel: "Content",
    label: "Basic Info",
    searchTerms: ["name", "headline", "title", "subtitle", "subheadline", "location", "button", "cta", "link", "event"],
    render: (ctx) => <BasicInfoSection form={ctx.form} update={ctx.update} events={ctx.events} />,
  },
  {
    id: "featured-event",
    group: "content",
    groupLabel: "Content",
    label: "Featured Event",
    searchTerms: ["featured", "event", "tags", "qr", "registration"],
    render: (ctx) => <FeaturedEventSection form={ctx.form} update={ctx.update} />,
  },
  {
    id: "promotion",
    group: "content",
    groupLabel: "Content",
    label: "Promotion Banner",
    searchTerms: ["promo", "banner", "announcement"],
    render: (ctx) => <PromotionSection form={ctx.form} update={ctx.update} />,
  },
  {
    id: "branding",
    group: "appearance",
    groupLabel: "Appearance",
    label: "Branding",
    searchTerms: ["logo", "background", "image", "video"],
    render: (ctx) => <BrandingSection form={ctx.form} update={ctx.update} />,
  },
  {
    id: "colors",
    group: "appearance",
    groupLabel: "Appearance",
    label: "Colors",
    searchTerms: ["color", "colour", "primary color", "secondary color", "accent color", "button color", "text color", "button style"],
    render: (ctx) => <ColorsSection form={ctx.form} update={ctx.update} />,
  },
  {
    id: "theme-palette",
    group: "appearance",
    groupLabel: "Appearance",
    label: "Theme Palette",
    searchTerms: ["color", "colour", "palette", "theme colors"],
    render: (ctx) => (
      <ThemePaletteSection form={ctx.form} onAdd={ctx.addThemeColor} onUpdate={ctx.updateThemeColor} onRemove={ctx.removeThemeColor} />
    ),
  },
  {
    id: "effects",
    group: "effects",
    groupLabel: "Effects",
    label: "Animation & Decorations",
    searchTerms: ["animation", "confetti", "fireworks", "particles", "decorative", "sparkle", "snow", "glow", "twinkle"],
    render: (ctx) => <EffectsSection form={ctx.form} update={ctx.update} onToggleDecorativeElement={ctx.toggleDecorativeElement} />,
  },
  {
    id: "scheduling",
    group: "scheduling",
    groupLabel: "Scheduling",
    label: "Date & Recurrence",
    searchTerms: ["date", "time", "recurrence", "weekly", "monthly", "countdown", "live", "pin", "override", "schedule"],
    render: (ctx) => (
      <SchedulingSection
        form={ctx.form}
        update={ctx.update}
        themeKey={ctx.themeKey}
        latest={ctx.latest}
        isPending={ctx.isPending}
        onTogglePinnedLive={ctx.onTogglePinnedLive}
      />
    ),
  },
  {
    id: "sponsors",
    group: "sponsors",
    groupLabel: "Sponsors",
    label: "Sponsor Logos",
    searchTerms: ["sponsor", "logo", "advertiser"],
    render: (ctx) => <SponsorsSection form={ctx.form} onAdd={ctx.addSponsor} onUpdate={ctx.updateSponsor} onRemove={ctx.removeSponsor} />,
  },
  {
    id: "history",
    group: "history",
    groupLabel: "History",
    label: "Version History",
    searchTerms: ["version", "rollback", "history", "revert"],
    render: (ctx) => <HistorySection versionHistory={ctx.versionHistory} latest={ctx.latest} onRollbackRequest={ctx.onRollbackRequest} />,
  },
];

export const THEME_EDITOR_GROUPS: { id: string; label: string }[] = Array.from(
  new Map(THEME_EDITOR_SECTIONS.map((s) => [s.group, s.groupLabel])).entries()
).map(([id, label]) => ({ id, label }));

export function searchThemeEditorSections(query: string): ThemeEditorSectionDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return THEME_EDITOR_SECTIONS;
  return THEME_EDITOR_SECTIONS.filter((s) => {
    const haystack = [s.label, s.groupLabel, ...s.searchTerms].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}
