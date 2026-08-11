import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const AVATAR_BUCKET = "avatars";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2MB — the cropped/compressed upload should be well under this
const AVATAR_MIME_TYPES = ["image/webp", "image/jpeg", "image/png"];

let bucketEnsured = false;

/**
 * Idempotently creates the public "avatars" Storage bucket if it doesn't
 * already exist, so avatar upload works without a manual Supabase dashboard
 * step. No-ops (including when SUPABASE_SERVICE_ROLE_KEY isn't configured —
 * same best-effort shape as getSupabaseAdmin()'s other callers).
 */
export async function ensureAvatarBucket(): Promise<boolean> {
  if (bucketEnsured) return true;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data: existing } = await admin.storage.getBucket(AVATAR_BUCKET);
  if (!existing) {
    const { error } = await admin.storage.createBucket(AVATAR_BUCKET, {
      public: true,
      fileSizeLimit: AVATAR_MAX_BYTES,
      allowedMimeTypes: AVATAR_MIME_TYPES,
    });
    // A concurrent request may have created it first — anything other than
    // "already exists" is a real failure the caller should see.
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }

  bucketEnsured = true;
  return true;
}

/**
 * Uploads a cropped/compressed avatar image and returns its public URL.
 * `path` should be unique per upload (see uploadMemberPhoto) so browsers
 * never serve a stale cached image after a member changes their photo.
 */
export async function uploadAvatarFile(path: string, blob: Blob): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Photo storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");

  await ensureAvatarBucket();

  const { error } = await admin.storage.from(AVATAR_BUCKET).upload(path, blob, {
    contentType: blob.type || "image/webp",
    upsert: true,
  });
  if (error) throw error;

  const { data } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const KIOSK_ASSETS_BUCKET = "kiosk-assets";
const KIOSK_BACKGROUND_MAX_BYTES = 10 * 1024 * 1024; // 10MB — full-bleed hero backgrounds, not compressed client-side like avatars
const KIOSK_BACKGROUND_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

let kioskBucketEnsured = false;

/** Same lazy, self-healing bucket-creation pattern as ensureAvatarBucket(). */
export async function ensureKioskAssetsBucket(): Promise<boolean> {
  if (kioskBucketEnsured) return true;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data: existing } = await admin.storage.getBucket(KIOSK_ASSETS_BUCKET);
  if (!existing) {
    const { error } = await admin.storage.createBucket(KIOSK_ASSETS_BUCKET, {
      public: true,
      fileSizeLimit: KIOSK_BACKGROUND_MAX_BYTES,
      allowedMimeTypes: KIOSK_BACKGROUND_MIME_TYPES,
    });
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }

  kioskBucketEnsured = true;
  return true;
}

/** Uploads a kiosk theme background image and returns its public URL. */
export async function uploadKioskBackgroundImage(path: string, blob: Blob): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("Image storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");

  await ensureKioskAssetsBucket();

  const { error } = await admin.storage.from(KIOSK_ASSETS_BUCKET).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: true,
  });
  if (error) throw error;

  const { data } = admin.storage.from(KIOSK_ASSETS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Mixed image/video/document mime allowlist, shared by every "post/message
// attachment" style bucket below — same idempotent-bucket pattern as
// ensureAvatarBucket/ensureKioskAssetsBucket.
const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024; // 25MB
const ATTACHMENT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

async function ensureAttachmentBucket(bucket: string, bucketEnsuredMap: Set<string>): Promise<boolean> {
  if (bucketEnsuredMap.has(bucket)) return true;

  const admin = getSupabaseAdmin();
  if (!admin) return false;

  const { data: existing } = await admin.storage.getBucket(bucket);
  if (!existing) {
    const { error } = await admin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: ATTACHMENT_MAX_BYTES,
      allowedMimeTypes: ATTACHMENT_MIME_TYPES,
    });
    if (error && !/already exists/i.test(error.message)) {
      throw error;
    }
  }

  bucketEnsuredMap.add(bucket);
  return true;
}

async function uploadAttachment(bucket: string, bucketEnsuredMap: Set<string>, path: string, blob: Blob): Promise<string> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("File storage is not configured (SUPABASE_SERVICE_ROLE_KEY missing).");

  await ensureAttachmentBucket(bucket, bucketEnsuredMap);

  const { error } = await admin.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw error;

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

const COMMUNITY_ATTACHMENTS_BUCKET = "community-attachments";
const communityBucketEnsured = new Set<string>();

export async function ensureCommunityAttachmentsBucket(): Promise<boolean> {
  return ensureAttachmentBucket(COMMUNITY_ATTACHMENTS_BUCKET, communityBucketEnsured);
}

/** Uploads a community post attachment (image/video/pdf/document) and returns its public URL. */
export async function uploadCommunityAttachment(path: string, blob: Blob): Promise<string> {
  return uploadAttachment(COMMUNITY_ATTACHMENTS_BUCKET, communityBucketEnsured, path, blob);
}

const MESSAGING_ATTACHMENTS_BUCKET = "messaging-attachments";
const messagingBucketEnsured = new Set<string>();

export async function ensureMessagingAttachmentsBucket(): Promise<boolean> {
  return ensureAttachmentBucket(MESSAGING_ATTACHMENTS_BUCKET, messagingBucketEnsured);
}

/** Uploads a direct-message attachment (image/video/pdf/document) and returns its public URL. */
export async function uploadMessagingAttachment(path: string, blob: Blob): Promise<string> {
  return uploadAttachment(MESSAGING_ATTACHMENTS_BUCKET, messagingBucketEnsured, path, blob);
}

const AGENCY_FILES_BUCKET = "agency-files";
const agencyFilesBucketEnsured = new Set<string>();

export async function ensureAgencyFilesBucket(): Promise<boolean> {
  return ensureAttachmentBucket(AGENCY_FILES_BUCKET, agencyFilesBucketEnsured);
}

/** Uploads an agency file (contract/invoice/campaign attachment/shared file) and returns its public URL. */
export async function uploadAgencyFile(path: string, blob: Blob): Promise<string> {
  return uploadAttachment(AGENCY_FILES_BUCKET, agencyFilesBucketEnsured, path, blob);
}
