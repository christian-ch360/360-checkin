/**
 * Branded placeholder art for creators with no photo (spec §9, §22): a
 * deterministic gradient + initials, never an AI-generated face. The same
 * creator always gets the same gradient so the grid feels intentional rather
 * than random on every render.
 */

export function creatorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C3";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Editorial gradient pairs tuned to sit under white overlay text. Hue spread
// is deliberate — no two adjacent cards in a typical grid collide.
const GRADIENTS: [string, string][] = [
  ["#4f46e5", "#0ea5e9"],
  ["#7c3aed", "#db2777"],
  ["#0891b2", "#4338ca"],
  ["#c026d3", "#6366f1"],
  ["#2563eb", "#14b8a6"],
  ["#e11d48", "#7c3aed"],
  ["#0d9488", "#1e40af"],
  ["#9333ea", "#2563eb"],
];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h << 5) - h + value.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function creatorGradient(seed: string): { from: string; to: string; css: string } {
  const [from, to] = GRADIENTS[hash(seed) % GRADIENTS.length];
  return { from, to, css: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` };
}
