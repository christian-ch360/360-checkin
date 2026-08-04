import type { EventCategory } from "@prisma/client";
import {
  Network,
  Wrench,
  Users,
  Mic,
  Camera,
  Megaphone,
  MessagesSquare,
  PartyPopper,
  GraduationCap,
  Handshake,
  ShoppingBag,
  Trophy,
  Gift,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const EVENT_CATEGORY_VALUES = [
  "NETWORKING",
  "WORKSHOP",
  "CREATOR_MEETUP",
  "PODCAST_RECORDING",
  "PHOTOSHOOT",
  "BRAND_ACTIVATION",
  "PANEL_DISCUSSION",
  "LAUNCH_PARTY",
  "MASTERCLASS",
  "COMMUNITY_MIXER",
  "PRODUCT_DEMO",
  "AWARDS_CEREMONY",
  "HOLIDAY_CELEBRATION",
  "OTHER",
] as const satisfies readonly EventCategory[];

type CategoryMeta = {
  label: string;
  icon: LucideIcon;
  /** Static Tailwind class strings (badge bg/text/border) — kept literal, not interpolated, so Tailwind's JIT scanner picks them up. */
  badgeClass: string;
  dotClass: string;
};

export const EVENT_CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  NETWORKING: { label: "Networking", icon: Network, badgeClass: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400", dotClass: "bg-blue-500" },
  WORKSHOP: { label: "Workshop", icon: Wrench, badgeClass: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400", dotClass: "bg-amber-500" },
  CREATOR_MEETUP: { label: "Creator Meetup", icon: Users, badgeClass: "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400", dotClass: "bg-violet-500" },
  PODCAST_RECORDING: { label: "Podcast Recording", icon: Mic, badgeClass: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400", dotClass: "bg-rose-500" },
  PHOTOSHOOT: { label: "Photoshoot", icon: Camera, badgeClass: "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400", dotClass: "bg-cyan-500" },
  BRAND_ACTIVATION: { label: "Brand Activation", icon: Megaphone, badgeClass: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400", dotClass: "bg-orange-500" },
  PANEL_DISCUSSION: { label: "Panel Discussion", icon: MessagesSquare, badgeClass: "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", dotClass: "bg-indigo-500" },
  LAUNCH_PARTY: { label: "Launch Party", icon: PartyPopper, badgeClass: "border-pink-500/20 bg-pink-500/10 text-pink-600 dark:text-pink-400", dotClass: "bg-pink-500" },
  MASTERCLASS: { label: "Masterclass", icon: GraduationCap, badgeClass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dotClass: "bg-emerald-500" },
  COMMUNITY_MIXER: { label: "Community Mixer", icon: Handshake, badgeClass: "border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400", dotClass: "bg-teal-500" },
  PRODUCT_DEMO: { label: "Product Demo", icon: ShoppingBag, badgeClass: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400", dotClass: "bg-sky-500" },
  AWARDS_CEREMONY: { label: "Awards Ceremony", icon: Trophy, badgeClass: "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", dotClass: "bg-yellow-500" },
  HOLIDAY_CELEBRATION: { label: "Holiday Celebration", icon: Gift, badgeClass: "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400", dotClass: "bg-red-500" },
  OTHER: { label: "Other", icon: Sparkles, badgeClass: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400", dotClass: "bg-slate-500" },
};
