-- Extends the existing KioskTheme model (rather than a new table/system) to
-- support the Charmzone Global event theme:
--   - checkInMessage: guest-facing "check-in messaging" (home-screen footer
--     + Success screen closing line). Nullable — every existing theme falls
--     back to its current hardcoded copy.
--   - themedActionButtons: opt-in flag letting a theme's buttonColor recolor
--     the shared Check In / Register cards, which are otherwise fixed
--     white/black regardless of theme. Defaults false, so the three already-
--     seeded presets (Christmas/Halloween/Whiskey Wednesday) — which already
--     set buttonColor for their Hero CTA — keep their current action-card
--     appearance unchanged.
--   - FLORAL_PETALS: one new entry in the existing closed decorativeElements
--     catalog (rendered via the existing sprite-drift effect, same mechanism
--     as e.g. PUMPKINS/ANIMATED_BATS), for the soft floral accent Concept 3
--     calls for. Purely additive to the enum.
ALTER TYPE "public"."KioskDecorativeElement" ADD VALUE 'FLORAL_PETALS';

ALTER TABLE "public"."kiosk_themes"
  ADD COLUMN "checkInMessage" TEXT,
  ADD COLUMN "themedActionButtons" BOOLEAN NOT NULL DEFAULT false;
