import { config as loadEnv } from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// SUPABASE_SERVICE_ROLE_KEY only lives in .env.local (the Next.js app env),
// not .env (the Prisma-CLI env, per .env.example's own instructions) — load
// both, with .env.local taking precedence, rather than dotenv/config's
// default of .env alone. Same convention as prisma/upload-welcome-newsletter.ts.
loadEnv({ path: resolve(__dirname, "../.env") });
loadEnv({ path: resolve(__dirname, "../.env.local"), override: true });

// Uploads the individual cropped assets for the CreatorHub360 Matcha
// Networking Event invitation email to the public "email-assets" Storage
// bucket. Each asset was cropped directly out of the approved reference
// artwork (not redrawn/recreated). Filenames are prefixed "ch360-matcha-"
// (not "charmzone-") — this campaign is a CreatorHub360 email only, with no
// relationship to the separate Charmzone kiosk project; the destination
// filenames are part of this email's delivered HTML (image src URLs), so
// they must not contain "charmzone" either. This replaces
// upload-charmzone-matcha-invitation-assets.ts, which was named under a
// mistaken assumption early in development — see matcha-networking-event-email.tsx.
//
// Uses a direct supabase-js client rather than importing
// src/lib/supabase/storage.ts, since that module is "server-only"-tagged and
// throws when required outside Next's bundler — same convention as
// prisma/upload-welcome-newsletter.ts / prisma/create-founder.ts.
//
// Every destination filename is content-hashed, not fixed — see
// upload-welcome-newsletter.ts's own comment for why (defeats mail-provider
// image-proxy caching).
//
// Run with: npx tsx prisma/upload-matcha-networking-event-assets.ts

const BUCKET = "email-assets";
const SOURCE_DIR =
  "/private/tmp/claude-501/-Users-cbipat-Desktop-ch360-crm-system/e7f2b14b-122b-4f8b-8705-26498358a7f6/scratchpad/email_assets";

const ASSETS: { key: string; file: string }[] = [
  { key: "hero", file: "hero.png" },
  { key: "qrCode", file: "qr_code.png" },
  { key: "clipboardIcon", file: "clipboard_icon.png" },
  { key: "checkIcon", file: "check_icon.png" },
  { key: "communityIcon", file: "community_icon.png" },
  { key: "calendarIcon", file: "calendar_icon.png" },
  { key: "step1", file: "step1.png" },
  { key: "step2", file: "step2.png" },
  { key: "step3", file: "step3.png" },
  { key: "socialInstagram", file: "social_instagram.png" },
  { key: "socialTiktok", file: "social_tiktok.png" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey || serviceRoleKey === "your-service-role-key") {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set to a real service role key.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: WebSocket as unknown as never },
  });

  console.log("Step 1 — Ensuring bucket exists");
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

  const urls: Record<string, string> = {};

  console.log("Step 2 — Uploading assets");
  for (const asset of ASSETS) {
    const sourcePath = resolve(SOURCE_DIR, asset.file);
    const fileBuffer = readFileSync(sourcePath);
    const contentHash = createHash("sha256").update(fileBuffer).digest("hex").slice(0, 12);
    const kebab = asset.key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    const destPath = `ch360-matcha-${kebab}-${contentHash}.png`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(destPath, fileBuffer, {
      contentType: "image/png",
      upsert: true,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(destPath);
    urls[asset.key] = data.publicUrl;
    console.log(`  ${asset.key.padEnd(16)} -> ${data.publicUrl}`);
  }

  const outPath = resolve(__dirname, ".matcha-networking-event-asset-urls.json");
  writeFileSync(outPath, JSON.stringify(urls, null, 2));
  console.log(`\nDone. Wrote all URLs to ${outPath}`);
}

main().catch((err) => {
  console.error("\nFailed:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
