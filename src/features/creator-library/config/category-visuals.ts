import type { ContentCategory } from "@prisma/client";

/**
 * Per-category emoji + soft pastel treatment for the CreatorHub360 Creator Network
 * category explorer, chips, and category views.
 *
 * `tint`/`text` are full literal Tailwind class strings (JIT scans source for
 * literals — never build these dynamically). Each reads as a warm pastel in
 * light mode and a muted glow in dark mode.
 */
export type CategoryVisual = { emoji: string; tint: string; text: string; dot: string };

export const CATEGORY_VISUALS: Record<ContentCategory, CategoryVisual> = {
  BEAUTY: { emoji: "💄", tint: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  FITNESS: { emoji: "💪", tint: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  FASHION: { emoji: "👗", tint: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  LIFESTYLE: { emoji: "☀️", tint: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  FOOD: { emoji: "🍴", tint: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  TRAVEL: { emoji: "✈️", tint: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  GAMING: { emoji: "🎮", tint: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  MUSIC: { emoji: "🎵", tint: "bg-fuchsia-500/10", text: "text-fuchsia-700 dark:text-fuchsia-300", dot: "bg-fuchsia-500" },
  COMEDY: { emoji: "😂", tint: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-300", dot: "bg-yellow-500" },
  TECH: { emoji: "💻", tint: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-300", dot: "bg-slate-500" },
  BUSINESS: { emoji: "💼", tint: "bg-stone-500/10", text: "text-stone-700 dark:text-stone-300", dot: "bg-stone-500" },
  SPORTS: { emoji: "🏅", tint: "bg-green-500/10", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  PHOTOGRAPHY: { emoji: "📷", tint: "bg-zinc-500/10", text: "text-zinc-700 dark:text-zinc-300", dot: "bg-zinc-500" },
  ENTERTAINMENT: { emoji: "🎬", tint: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  EDUCATION: { emoji: "🎓", tint: "bg-blue-500/10", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  PARENTING: { emoji: "🧸", tint: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-300", dot: "bg-teal-500" },
  AUTOMOTIVE: { emoji: "🚗", tint: "bg-red-500/10", text: "text-red-700 dark:text-red-300", dot: "bg-red-500" },
  HOME_DESIGN: { emoji: "🛋️", tint: "bg-lime-500/10", text: "text-lime-700 dark:text-lime-300", dot: "bg-lime-500" },
  DANCE: { emoji: "🩰", tint: "bg-pink-500/10", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  ENTREPRENEURSHIP: { emoji: "🚀", tint: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  MODELING: { emoji: "📸", tint: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  PETS: { emoji: "🐾", tint: "bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  FINANCE: { emoji: "📈", tint: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  LUXURY: { emoji: "💎", tint: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  HEALTH: { emoji: "🌿", tint: "bg-green-500/10", text: "text-green-700 dark:text-green-300", dot: "bg-green-500" },
  ART: { emoji: "🎨", tint: "bg-fuchsia-500/10", text: "text-fuchsia-700 dark:text-fuchsia-300", dot: "bg-fuchsia-500" },
  DIY: { emoji: "🔨", tint: "bg-orange-500/10", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
  STREAMING: { emoji: "🎥", tint: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  VLOGS: { emoji: "🎞️", tint: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  PODCASTS: { emoji: "🎙️", tint: "bg-purple-500/10", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
};

const FALLBACK: CategoryVisual = {
  emoji: "✨",
  tint: "bg-muted",
  text: "text-muted-foreground",
  dot: "bg-muted-foreground",
};

export function categoryVisual(category: ContentCategory): CategoryVisual {
  return CATEGORY_VISUALS[category] ?? FALLBACK;
}
