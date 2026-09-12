-- Opt-in flag for backgroundImageUrl to render as `object-contain` (whole
-- image, no cropping) instead of the default `object-cover` (crop-to-fill).
-- Defaults false, so every theme already using backgroundImageUrl keeps its
-- exact current crop-to-fill appearance; a theme whose artwork is a
-- deliberately-composed poster (meaningful content at the edges) sets this
-- true so nothing is ever cropped away.
ALTER TABLE "public"."kiosk_themes"
  ADD COLUMN "backgroundContain" BOOLEAN NOT NULL DEFAULT false;
