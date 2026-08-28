-- Opt-out flag for the dark gradient KioskThemeBackground always lays over
-- a backgroundImageUrl. Defaults true, so every theme already using
-- backgroundImageUrl keeps its exact current appearance; a theme with an
-- intentionally light background image (not a dimmed photo backdrop) sets
-- this false to render its image with no wash.
ALTER TABLE "public"."kiosk_themes"
  ADD COLUMN "backgroundOverlay" BOOLEAN NOT NULL DEFAULT true;
