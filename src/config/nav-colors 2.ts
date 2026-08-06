export type AccentName =
  | "blue"
  | "cyan"
  | "purple"
  | "indigo"
  | "orange"
  | "emerald"
  | "pink"
  | "green"
  | "yellow"
  | "violet"
  | "gray"
  | "amber"
  | "teal"
  | "slate";

type AccentBundle = {
  /** Inactive icon color — muted until the item becomes active. */
  icon: string;
  activeIcon: string;
  activeBg: string;
  activeText: string;
  /** Left accent bar shown next to the active item. */
  bar: string;
  /** Subtle glow behind the active item. */
  glow: string;
};

// Written as static, literal-per-color bundles (not runtime `bg-${color}-500`
// interpolation) because Tailwind's class scanner needs statically
// analyzable class names in source to generate the corresponding CSS.
export const NAV_ACCENTS: Record<AccentName, AccentBundle> = {
  blue: {
    icon: "text-blue-500/50 dark:text-blue-400/40",
    activeIcon: "text-blue-600 dark:text-blue-400",
    activeBg: "bg-blue-500/10 dark:bg-blue-500/15",
    activeText: "text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500 dark:bg-blue-400",
    glow: "shadow-[0_0_20px_-4px] shadow-blue-500/25 dark:shadow-blue-400/20",
  },
  cyan: {
    icon: "text-cyan-500/50 dark:text-cyan-400/40",
    activeIcon: "text-cyan-600 dark:text-cyan-400",
    activeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    activeText: "text-cyan-700 dark:text-cyan-300",
    bar: "bg-cyan-500 dark:bg-cyan-400",
    glow: "shadow-[0_0_20px_-4px] shadow-cyan-500/25 dark:shadow-cyan-400/20",
  },
  purple: {
    icon: "text-purple-500/50 dark:text-purple-400/40",
    activeIcon: "text-purple-600 dark:text-purple-400",
    activeBg: "bg-purple-500/10 dark:bg-purple-500/15",
    activeText: "text-purple-700 dark:text-purple-300",
    bar: "bg-purple-500 dark:bg-purple-400",
    glow: "shadow-[0_0_20px_-4px] shadow-purple-500/25 dark:shadow-purple-400/20",
  },
  indigo: {
    icon: "text-indigo-500/50 dark:text-indigo-400/40",
    activeIcon: "text-indigo-600 dark:text-indigo-400",
    activeBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
    activeText: "text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500 dark:bg-indigo-400",
    glow: "shadow-[0_0_20px_-4px] shadow-indigo-500/25 dark:shadow-indigo-400/20",
  },
  orange: {
    icon: "text-orange-500/50 dark:text-orange-400/40",
    activeIcon: "text-orange-600 dark:text-orange-400",
    activeBg: "bg-orange-500/10 dark:bg-orange-500/15",
    activeText: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500 dark:bg-orange-400",
    glow: "shadow-[0_0_20px_-4px] shadow-orange-500/25 dark:shadow-orange-400/20",
  },
  emerald: {
    icon: "text-emerald-500/50 dark:text-emerald-400/40",
    activeIcon: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    activeText: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500 dark:bg-emerald-400",
    glow: "shadow-[0_0_20px_-4px] shadow-emerald-500/25 dark:shadow-emerald-400/20",
  },
  pink: {
    icon: "text-pink-500/50 dark:text-pink-400/40",
    activeIcon: "text-pink-600 dark:text-pink-400",
    activeBg: "bg-pink-500/10 dark:bg-pink-500/15",
    activeText: "text-pink-700 dark:text-pink-300",
    bar: "bg-pink-500 dark:bg-pink-400",
    glow: "shadow-[0_0_20px_-4px] shadow-pink-500/25 dark:shadow-pink-400/20",
  },
  green: {
    icon: "text-green-500/50 dark:text-green-400/40",
    activeIcon: "text-green-600 dark:text-green-400",
    activeBg: "bg-green-500/10 dark:bg-green-500/15",
    activeText: "text-green-700 dark:text-green-300",
    bar: "bg-green-500 dark:bg-green-400",
    glow: "shadow-[0_0_20px_-4px] shadow-green-500/25 dark:shadow-green-400/20",
  },
  yellow: {
    icon: "text-yellow-500/50 dark:text-yellow-400/40",
    activeIcon: "text-yellow-600 dark:text-yellow-400",
    activeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    activeText: "text-yellow-700 dark:text-yellow-300",
    bar: "bg-yellow-500 dark:bg-yellow-400",
    glow: "shadow-[0_0_20px_-4px] shadow-yellow-500/25 dark:shadow-yellow-400/20",
  },
  violet: {
    icon: "text-violet-500/50 dark:text-violet-400/40",
    activeIcon: "text-violet-600 dark:text-violet-400",
    activeBg: "bg-violet-500/10 dark:bg-violet-500/15",
    activeText: "text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500 dark:bg-violet-400",
    glow: "shadow-[0_0_20px_-4px] shadow-violet-500/25 dark:shadow-violet-400/20",
  },
  gray: {
    icon: "text-gray-500/50 dark:text-gray-400/40",
    activeIcon: "text-gray-600 dark:text-gray-400",
    activeBg: "bg-gray-500/10 dark:bg-gray-500/15",
    activeText: "text-gray-700 dark:text-gray-300",
    bar: "bg-gray-500 dark:bg-gray-400",
    glow: "shadow-[0_0_20px_-4px] shadow-gray-500/25 dark:shadow-gray-400/20",
  },
  amber: {
    icon: "text-amber-500/50 dark:text-amber-400/40",
    activeIcon: "text-amber-600 dark:text-amber-400",
    activeBg: "bg-amber-500/10 dark:bg-amber-500/15",
    activeText: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500 dark:bg-amber-400",
    glow: "shadow-[0_0_20px_-4px] shadow-amber-500/25 dark:shadow-amber-400/20",
  },
  teal: {
    icon: "text-teal-500/50 dark:text-teal-400/40",
    activeIcon: "text-teal-600 dark:text-teal-400",
    activeBg: "bg-teal-500/10 dark:bg-teal-500/15",
    activeText: "text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500 dark:bg-teal-400",
    glow: "shadow-[0_0_20px_-4px] shadow-teal-500/25 dark:shadow-teal-400/20",
  },
  slate: {
    icon: "text-slate-500/50 dark:text-slate-400/40",
    activeIcon: "text-slate-600 dark:text-slate-400",
    activeBg: "bg-slate-500/10 dark:bg-slate-500/15",
    activeText: "text-slate-700 dark:text-slate-300",
    bar: "bg-slate-500 dark:bg-slate-400",
    glow: "shadow-[0_0_20px_-4px] shadow-slate-500/25 dark:shadow-slate-400/20",
  },
};
