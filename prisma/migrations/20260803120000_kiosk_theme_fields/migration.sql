-- CreateEnum
CREATE TYPE "KioskLogoVariant" AS ENUM ('DEFAULT', 'LIGHT', 'DARK', 'HIDDEN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "KioskButtonStyle" AS ENUM ('SOLID', 'OUTLINE', 'GLASS', 'GRADIENT');

-- CreateEnum
CREATE TYPE "KioskDecorativeElement" AS ENUM ('SNOWFALL', 'CHRISTMAS_LIGHTS', 'DECORATED_TREES', 'WRAPPED_GIFTS', 'GOLD_GLOW', 'PUMPKINS', 'SPIDER_WEBS', 'PURPLE_LIGHTING', 'FLOATING_GHOSTS', 'ANIMATED_BATS', 'LUXURY_VIGNETTE', 'LEATHER_TEXTURE', 'WHISKEY_GLOW', 'WARM_LIGHTING', 'COPPER_ACCENTS', 'CONFETTI', 'SPARKLES', 'BOKEH_LIGHTS');

-- AlterTable
ALTER TABLE "kiosk_themes" ADD COLUMN     "buttonStyle" "KioskButtonStyle" NOT NULL DEFAULT 'SOLID',
ADD COLUMN     "buttonTextColor" TEXT,
ADD COLUMN     "decorativeElements" "KioskDecorativeElement"[] DEFAULT ARRAY[]::"KioskDecorativeElement"[],
ADD COLUMN     "featuredEventTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "featuredEventTitle" TEXT,
ADD COLUMN     "logoVariant" "KioskLogoVariant" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "promoBannerLink" TEXT,
ADD COLUMN     "promoBannerText" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "showQrRegistration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "themeColors" JSONB;

