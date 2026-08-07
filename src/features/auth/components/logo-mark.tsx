import Image from "next/image";
import ch360Logo from "../../../../images/Ch360 Logo 3.PNG";

const SIZES = {
  xs: { className: "size-7", px: 28 },
  sm: { className: "size-9", px: 36 },
  md: { className: "size-11", px: 44 },
  lg: { className: "size-14", px: 56 },
  xl: { className: "size-24", px: 96 },
} as const;

export function LogoMark({
  size = "md",
  style,
}: {
  size?: keyof typeof SIZES;
  /** Accepted for backward compatibility with existing call sites — the logo is a
   * self-contained image with its own fixed color scheme, so it no longer needs
   * a separate light/dark treatment. */
  variant?: "dark" | "light";
  /** Overrides the rendered width/height beyond the fixed `size` tiers — used
   * where the logo's size is itself theme-configurable (e.g. the Kiosk Hero). */
  style?: React.CSSProperties;
}) {
  const { className, px } = SIZES[size];
  return (
    <Image
      src={ch360Logo}
      alt="CreatorHub360"
      width={px}
      height={px}
      className={`${className} shrink-0 rounded-2xl object-cover`}
      style={style}
    />
  );
}
