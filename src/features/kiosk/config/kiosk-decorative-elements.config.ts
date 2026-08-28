import type { KioskDecorativeElement } from "@prisma/client";

/**
 * A closed catalog of visual flourishes rather than free-form theming: each
 * value maps to one generic, theme-color-tinted effect (particles, glow,
 * emoji-sprites) rendered by KioskDecorativeLayer. This is what makes
 * "unlimited future themes without code changes" honest — a Black Friday or
 * Investor Week theme picks from this same list and re-tints it via its own
 * themeColors, rather than needing a bespoke renderer per theme. Only the
 * *set* of effects is fixed; which themes use which, and in what colors, is
 * fully Super-Admin-configurable.
 */
export type DecorativeEffectKind = "particles-fall" | "particles-float" | "twinkle" | "glow" | "sprite-drift" | "firework-burst" | "light-rays";

export type DecorativeElementDef = {
  label: string;
  description: string;
  effect: DecorativeEffectKind;
  /** Emoji sprite used by sprite-drift effects — ignored by other effect kinds. */
  sprite?: string;
};

export const KIOSK_DECORATIVE_ELEMENTS: Record<KioskDecorativeElement, DecorativeElementDef> = {
  SNOWFALL: { label: "Snowfall", description: "Soft falling snow across the hero.", effect: "particles-fall", sprite: "❄" },
  CHRISTMAS_LIGHTS: { label: "Christmas Lights", description: "Twinkling string-light glow along the top edge.", effect: "twinkle" },
  DECORATED_TREES: { label: "Decorated Trees", description: "Small ornament sprites drifting near the edges.", effect: "sprite-drift", sprite: "🎄" },
  WRAPPED_GIFTS: { label: "Wrapped Gifts", description: "Gift-box sprites drifting near the edges.", effect: "sprite-drift", sprite: "🎁" },
  GOLD_GLOW: { label: "Soft Gold Glow", description: "A warm gold ambient glow behind the content.", effect: "glow" },
  PUMPKINS: { label: "Pumpkins", description: "Pumpkin sprites drifting near the edges.", effect: "sprite-drift", sprite: "🎃" },
  SPIDER_WEBS: { label: "Spider Webs", description: "Web sprites tucked into the corners.", effect: "sprite-drift", sprite: "🕸️" },
  PURPLE_LIGHTING: { label: "Purple Lighting", description: "A moody purple ambient glow behind the content.", effect: "glow" },
  FLOATING_GHOSTS: { label: "Floating Ghosts", description: "Ghost sprites drifting slowly upward.", effect: "particles-float", sprite: "👻" },
  ANIMATED_BATS: { label: "Animated Bats", description: "Bat sprites swooping across the hero.", effect: "sprite-drift", sprite: "🦇" },
  LUXURY_VIGNETTE: { label: "Luxury Lounge Vignette", description: "A soft dark vignette for an executive-lounge feel.", effect: "glow" },
  LEATHER_TEXTURE: { label: "Leather Texture", description: "A subtle warm-toned grain overlay.", effect: "glow" },
  WHISKEY_GLOW: { label: "Whiskey Glow", description: "An amber ambient glow behind the content.", effect: "glow" },
  WARM_LIGHTING: { label: "Warm Lighting", description: "A warm overhead-light gradient wash.", effect: "twinkle" },
  COPPER_ACCENTS: { label: "Copper Accents", description: "Slow-drifting copper-toned light particles.", effect: "particles-float", sprite: "✦" },
  CONFETTI: { label: "Confetti", description: "Falling confetti pieces in the theme's colors.", effect: "particles-fall", sprite: "▪" },
  SPARKLES: { label: "Sparkles", description: "Twinkling sparkle particles.", effect: "twinkle" },
  BOKEH_LIGHTS: { label: "Bokeh Lights", description: "Soft out-of-focus light orbs drifting behind the content.", effect: "particles-float", sprite: "●" },
  FIREWORKS: { label: "Fireworks", description: "Periodic firework bursts launching and exploding across the sky.", effect: "firework-burst" },
  LIGHT_RAYS: { label: "Light Rays", description: "Soft animated light rays sweeping behind the content.", effect: "light-rays" },
  FLORAL_PETALS: { label: "Floral Petals", description: "Delicate petals drifting slowly near the edges.", effect: "sprite-drift", sprite: "🌸" },
};

export const KIOSK_DECORATIVE_ELEMENT_VALUES = Object.keys(KIOSK_DECORATIVE_ELEMENTS) as KioskDecorativeElement[];
