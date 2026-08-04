-- AlterTable
ALTER TABLE "membership_applications" ADD COLUMN     "notesUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "notesUpdatedById" UUID;

-- AddForeignKey
ALTER TABLE "membership_applications" ADD CONSTRAINT "membership_applications_notesUpdatedById_fkey" FOREIGN KEY ("notesUpdatedById") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

