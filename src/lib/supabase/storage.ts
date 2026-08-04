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
