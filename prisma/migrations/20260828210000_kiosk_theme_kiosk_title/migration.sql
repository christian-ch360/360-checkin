-- Adds an optional third heading tier to KioskTheme so a theme can present
-- a dedicated primary title (e.g. "KIOSK CHECK-IN") distinct from its
-- brand-wordmark headline, without collapsing both into one field.
-- Nullable, so every existing theme (which has no column value yet) keeps
-- rendering its current two-tier headline/subheadline hero unchanged.
ALTER TABLE "public"."kiosk_themes"
  ADD COLUMN "kioskTitle" TEXT;
