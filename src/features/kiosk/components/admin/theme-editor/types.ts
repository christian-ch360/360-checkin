import type {
  KioskAnimationStyle,
  KioskButtonStyle,
  KioskDecorativeElement,
  KioskLogoVariant,
  KioskRecurrence,
  KioskThemeStatus,
} from "@prisma/client";

export type Sponsor = { name: string; logoUrl: string; message?: string; ctaLabel?: string; ctaLink?: string };
export type ThemeColor = { name: string; hex: string };

export type FormState = {
  name: string;
  headline: string;
  subheadline: string;
  location: string;
  parkingInfo: string;
  backgroundImageUrl: string;
  backgroundVideoUrl: string;
  logoOverrideUrl: string;
  logoVariant: KioskLogoVariant;
  heroLogoSize: number;
  heroTitleSize: number;
  heroSubtitleSize: number;
  heroDateTimeSize: number;
  heroLocationSize: number;
  heroCountdownSize: number;
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

/** Passed down to every section panel — identical shape to the setter kiosk-theme-editor.tsx has always used. */
export type UpdateFormField = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

export type EditableThemeVersion = {
  id: string;
  version: number;
  status: KioskThemeStatus;
  isDefault: boolean;
  isPinnedLive: boolean;
  name: string;
  headline: string;
  subheadline: string | null;
  location: string | null;
  parkingInfo: string | null;
  backgroundImageUrl: string | null;
  backgroundVideoUrl: string | null;
  logoOverrideUrl: string | null;
  logoVariant: KioskLogoVariant;
  heroLogoSize: number | null;
  heroTitleSize: number | null;
  heroSubtitleSize: number | null;
  heroDateTimeSize: number | null;
  heroLocationSize: number | null;
  heroCountdownSize: number | null;
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
  /** Used only for the "Last saved" indicator in the top bar — presentational only. */
  updatedAt: Date;
};
