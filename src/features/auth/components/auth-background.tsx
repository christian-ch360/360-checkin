/**
 * Fixed, full-viewport dark backdrop shared by every auth screen: charcoal
 * gradient base + faint grid + faint noise + two slow-drifting glow orbs.
 * Purely decorative (aria-hidden), sits behind the two-column layout via
 * -z-10 so it never intercepts clicks or shows up in the tab order.
 */
export function AuthBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden bg-[#08090b]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0d10] via-[#08090b] to-[#0a0b0d]" />
      <div className="absolute inset-0 auth-grid-bg" />
      <div className="absolute inset-0 auth-noise-bg" />
      <div className="animate-aurora-a absolute top-[-10%] left-[-10%] size-[45vw] rounded-full bg-indigo-500/[0.10] blur-[120px]" />
      <div className="animate-aurora-b absolute bottom-[-15%] right-[-10%] size-[40vw] rounded-full bg-sky-400/[0.08] blur-[120px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#08090b] via-transparent to-transparent" />
    </div>
  );
}
