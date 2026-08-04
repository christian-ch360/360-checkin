/**
 * Fixed, full-viewport backdrop for every kiosk screen — bright and
 * minimal, matching the light Apple-inspired system used at /login and
 * /apply: a white base with the barest hint of soft gray for depth. No
 * grid, noise, or glow — heavy decoration reads as "dark app," not "Apple
 * Store kiosk." Purely decorative (aria-hidden), sits behind kiosk content
 * via -z-10. Kept as its own copy (not importing from features/auth) since
 * kiosk is a standalone, unauthenticated route tree.
 */
export function KioskBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-[#f8f8f8]" />
    </div>
  );
}
