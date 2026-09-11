-- Creator Library ("C360 Creator Network") — one new table, additive only.
-- Per-creator opt-in record for the public, password-gated /creator-library
-- surface. Deliberately 1:1 with members rather than new columns on that
-- (already very wide) table, so getCurrentMember()'s include and every
-- existing Member query are untouched. Null override columns fall back to the
-- equivalent Member field at read time; Ops edits here never mutate the
-- creator's own self-service profile.

-- CreateTable
CREATE TABLE "creator_library_profiles" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER,
    "headline" TEXT,
    "libraryBio" TEXT,
    "locationLabel" TEXT,
    "categories" "ContentCategory"[] DEFAULT ARRAY[]::"ContentCategory"[],
    "imageUrl" TEXT,
    "instagramFollowers" INTEGER,
    "tiktokFollowers" INTEGER,
    "youtubeSubscribers" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "addedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_library_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_library_profiles_memberId_key" ON "creator_library_profiles"("memberId");

-- CreateIndex
CREATE INDEX "creator_library_profiles_organizationId_visible_idx" ON "creator_library_profiles"("organizationId", "visible");

-- CreateIndex
CREATE INDEX "creator_library_profiles_organizationId_featured_visible_idx" ON "creator_library_profiles"("organizationId", "featured", "visible");

-- AddForeignKey
ALTER TABLE "creator_library_profiles" ADD CONSTRAINT "creator_library_profiles_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_library_profiles" ADD CONSTRAINT "creator_library_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_library_profiles" ADD CONSTRAINT "creator_library_profiles_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
