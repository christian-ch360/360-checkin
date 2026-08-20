import { config as loadEnv } from "dotenv";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// SUPABASE_SERVICE_ROLE_KEY only lives in .env.local (the Next.js app env),
// not .env (the Prisma-CLI env, per .env.example's own instructions) — load
// both, with .env.local taking precedence, rather than dotenv/config's
// default of .env alone.
loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(__dirname, "../.env.local"), override: true });

// Uploads the CreatorHub360 welcome newsletter artwork (images/newsletter.png)
// to the public "email-assets" Storage bucket, so the welcome_newsletter email
// template can reference it by a real hosted URL rather than a local file
// path. Uses a direct supabase-js client rather than importing
// src/lib/supabase/storage.ts, since that module is "server-only"-tagged and
// throws when required outside Next's bundler — same convention as
// prisma/create-founder.ts.
//
// The destination filename is content-hashed (welcome-newsletter-<hash>.png),
// not a fixed name — a fixed name that gets overwritten in place is exactly
// what causes mail-provider image proxies (Apple Mail Privacy Protection,
// Gmail's proxy, etc.) to keep serving stale cached bytes for that URL after
// the artwork changes, since those proxies cache per-URL on their own
// infrastructure and don't reliably respect origin cache-control headers.
// A content hash means a changed image is *never* the same URL as before, so
// no proxy can ever have a stale copy of it.
//
// Run with: npx tsx prisma/upload-welcome-newsletter.ts
// Then copy the printed URL into NEWSLETTER_IMAGE_URL in
// src/emails/templates/membership/welcome-newsletter-email.tsx.

const BUCKET = "email-assets";
const SOURCE_PATH = resolve(__dirname, "../images/newsletter.png");

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey || serviceRoleKey === "your-service-role-key") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to a real service role key.");
  }

  // Node 20 has no native WebSocket global; @supabase/supabase-js's Realtime
  // module needs one to even construct, though this script never uses
  // Realtime — same fix as prisma/create-founder.ts.
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as never },
  });

  console.log("Step 1/3 — Ensuring bucket exists");
  const { data: existingBucket } = await supabase.storage.getBucket(BUCKET);
  if (!existingBucket) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    });
    if (error && !/already exists/i.test(error.message)) throw error;
    console.log(`  created bucket "${BUCKET}"`);
  } else {
    console.log(`  bucket "${BUCKET}" already exists`);
  }

  console.log("Step 2/3 — Uploading artwork");
  const fileBuffer = readFileSync(SOURCE_PATH);
  console.log(`  read ${SOURCE_PATH} (${(fileBuffer.byteLength / 1024).toFixed(0)} KB)`);
  const contentHash = createHash("sha256").update(fileBuffer).digest("hex").slice(0, 12);
  const destPath = `welcome-newsletter-${contentHash}.png`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(destPath, fileBuffer, {
    contentType: "image/png",
    upsert: true, // idempotent re-run for the exact same content, not an overwrite of different content — the hash makes those two cases impossible to conflate
  });
  if (uploadError) throw uploadError;
  console.log(`  uploaded to ${BUCKET}/${destPath}`);

  console.log("Step 3/3 — Resolving public URL");
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(destPath);
  console.log(`\nDone. Public URL:\n  ${data.publicUrl}`);
  console.log(`\nUpdate NEWSLETTER_IMAGE_URL in`);
  console.log(`  src/emails/templates/membership/welcome-newsletter-email.tsx`);
  console.log(`to this URL if it isn't already set to it.`);
}

main().catch((err) => {
  console.error("\nFailed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
