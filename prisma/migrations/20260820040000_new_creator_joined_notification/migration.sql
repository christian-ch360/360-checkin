-- The "new_creator_joined_admin" internal admin email (sent to every admin
-- with admin.access when a CREATOR application is approved) is being
-- replaced with an in-app notification via the existing Notification/bell
-- system — matching the precedent already set for
-- new_membership_application_admin, which was converted from an email to
-- the MEMBERSHIP_APPLICATION_RECEIVED in-app notification at submission
-- time. This adds the one new NotificationType value that conversion needs.
ALTER TYPE "public"."NotificationType" ADD VALUE 'NEW_CREATOR_JOINED';
