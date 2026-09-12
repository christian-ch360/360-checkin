"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import { toast } from "sonner";
import { ImageIcon, Loader2, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DropzoneUploadResult = { success: true; url: string } | { success: false; error: string };
export type DropzoneRemoveResult = { success: true } | { success: false; error: string };

/**
 * Shared premium drag-and-drop upload zone for Creator Library Settings
 * (the hero banner image and the Card Placeholder Icon). Drag files in,
 * click to browse, preview what's uploaded, replace or remove it — all
 * through the same primitive so both settings read identically.
 */
export function LibraryDropzoneUploader({
  title,
  description,
  currentUrl,
  accept,
  hint,
  previewFit = "cover",
  onUpload,
  onRemove,
}: {
  title: string;
  description: string;
  currentUrl: string | null;
  /** e.g. "image/png,image/jpeg,image/webp" */
  accept: string;
  hint: string;
  previewFit?: "cover" | "contain";
  onUpload: (file: File) => Promise<DropzoneUploadResult>;
  onRemove: () => Promise<DropzoneRemoveResult>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [isPending, startTransition] = useTransition();

  function accepts(file: File): boolean {
    const types = accept.split(",").map((t) => t.trim());
    return types.includes(file.type) || (file.type === "image/svg+xml" && types.includes("image/svg+xml"));
  }

  function handleFile(file: File) {
    if (!accepts(file)) {
      toast.error("That file type isn't supported here.");
      return;
    }
    startTransition(async () => {
      const result = await onUpload(file);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreview(result.url);
      toast.success("Uploaded.");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await onRemove();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setPreview(null);
      toast.success("Removed.");
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragging ? "border-[var(--community)] bg-[var(--community)]/5" : "border-border hover:border-foreground/30",
          preview && "border-solid border-border p-0",
        )}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Supabase-hosted upload preview */}
            <img
              src={preview}
              alt="Current upload"
              className={cn("max-h-[220px] w-full rounded-2xl", previewFit === "cover" ? "h-[220px] object-cover" : "bg-muted object-contain p-6")}
            />
            {isPending ? (
              <div className="absolute inset-0 grid place-items-center rounded-2xl bg-background/70">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              {isPending ? <Loader2 className="size-5 animate-spin" /> : <UploadCloud className="size-5" />}
            </span>
            <p className="text-sm font-medium">Drag &amp; drop {title.toLowerCase()} here</p>
            <p className="text-xs text-muted-foreground">or click to browse</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {preview ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => inputRef.current?.click()}>
            <ImageIcon className="size-3.5" />
            Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={handleRemove}>
            <Trash2 className="size-3.5" />
            Remove
          </Button>
        </div>
      ) : null}
    </div>
  );
}
