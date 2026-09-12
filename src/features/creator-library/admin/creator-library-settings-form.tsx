"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  LibraryDropzoneUploader,
  type DropzoneRemoveResult,
  type DropzoneUploadResult,
} from "@/features/creator-library/admin/library-dropzone-uploader";
import {
  removeLibraryHeroImage,
  removeLibraryPlaceholderIcon,
  uploadLibraryHeroImage,
  uploadLibraryPlaceholderIcon,
} from "@/features/creator-library/services/creator-library-settings.actions";
import type { CreatorLibrarySettings } from "@/features/creator-library/lib/library-settings";

async function upload(action: (fd: FormData) => Promise<{ success: boolean; error?: string; settings?: { heroImageUrl?: string | null; placeholderIconUrl?: string | null } }>, file: File, key: "heroImageUrl" | "placeholderIconUrl"): Promise<DropzoneUploadResult> {
  const fd = new FormData();
  fd.set("file", file);
  const result = await action(fd);
  if (!result.success) return { success: false, error: result.error ?? "Upload failed." };
  const url = result.settings?.[key];
  if (!url) return { success: false, error: "Upload succeeded but no URL was returned." };
  return { success: true, url };
}

async function remove(action: () => Promise<{ success: boolean; error?: string }>): Promise<DropzoneRemoveResult> {
  const result = await action();
  return result.success ? { success: true } : { success: false, error: result.error ?? "Couldn't remove it." };
}

/**
 * Creator Library Settings — the org's hero collage photo and the global
 * Card Placeholder Icon shown on any creator with no photo. Both persist to
 * `Organization.settings.creatorLibrary` (no schema change).
 */
export function CreatorLibrarySettingsForm({ settings }: { settings: CreatorLibrarySettings }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Public Hero Collage
            </p>
            <h2 className="mt-1 text-lg font-semibold">Hero Image</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A featured editorial photo in the /creator-library hero collage, framed with a gold
              accent border. Falls back to real creator portraits when nothing is uploaded.
            </p>
          </div>

          <LibraryDropzoneUploader
            title="Hero Image"
            description="Recommended: a portrait-oriented editorial photo."
            currentUrl={settings.heroImageUrl}
            accept="image/jpeg,image/png,image/webp"
            hint="JPEG, PNG, or WebP · up to 8MB"
            previewFit="cover"
            onUpload={(file) => upload(uploadLibraryHeroImage, file, "heroImageUrl")}
            onRemove={() => remove(removeLibraryHeroImage)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-6 p-6">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Creator Cards
            </p>
            <h2 className="mt-1 text-lg font-semibold">Card Placeholder Icon</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a fallback image/icon for creators without a profile portrait. Falls back to a
              branded gradient + initials mark when nothing is uploaded.
            </p>
          </div>

          <LibraryDropzoneUploader
            title="Icon"
            description=""
            currentUrl={settings.placeholderIconUrl}
            accept="image/png,image/svg+xml"
            hint="PNG or SVG · Recommended: 400×400 · up to 2MB"
            previewFit="contain"
            onUpload={(file) => upload(uploadLibraryPlaceholderIcon, file, "placeholderIconUrl")}
            onRemove={() => remove(removeLibraryPlaceholderIcon)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
