// Single source of truth for every color used across email templates —
// matches the app's --success token (oklch(0.6 0.17 152) ≈ #16A34A) for the
// accent, keeps the existing dark near-black header/button color from the
// prior template set so this reads as a refinement, not a re-brand.
export const COLORS = {
  pageBg: "#f4f4f5",
  card: "#ffffff",
  header: "#0a0a0a",
  text: "#18181b",
  muted: "#71717a",
  border: "#e4e4e7",
  accent: "#16a34a",
  accentSoft: "#dcfce7",
  darkPageBg: "#09090b",
  darkCard: "#18181b",
  darkText: "#f4f4f5",
  darkMuted: "#a1a1aa",
  darkBorder: "#3f3f46",
};

export const FONT_STACK = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

// Shared body/muted text styles so every template doesn't redefine the same
// two style objects — paired with the "email-text"/"email-muted" classNames
// EmailLayout's dark-mode <style> block targets.
export const bodyText = { margin: "0 0 16px", color: COLORS.text };
export const mutedText = { margin: 0, color: COLORS.muted, fontSize: 13 };
