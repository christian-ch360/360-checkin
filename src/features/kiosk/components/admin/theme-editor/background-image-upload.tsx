"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ChevronRight, ImageIcon, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { uploadThemeBackgroundImageAction } from "@/features/kiosk/services/kiosk-theme-actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function guessFileName(url: string): string {
  try {
    const { pathname } = new URL(url);
    const last = pathname.split("/").pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
}

export function BackgroundImageUpload({
  themeKey,
  value,
  onChange,
}: {
  themeKey?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedMeta, setUploadedMeta] = useState<{ name: string; size: number } | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [showUrlField, setShowUrlField] = useState(false);

  useEffect(() => {
    if (!value) {
      setDimensions(null);
      return;
    }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) setDimensions(null);
    };
    img.src = value;
    return () => {
      cancelled = true;
    };
  }, [value]);

  // Paste-to-upload only while this section is mounted/visible — a plain window
  // listener (rather than requiring focus inside the dropzone) matches the
  // "paste an image" affordance products like Linear/Notion offer.
  const handleFileRef = useRef<(file: File) => void>(() => {});
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const file = Array.from(e.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        e.preventDefault();
        handleFileRef.current(file);
      }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please upload a JPG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That image is larger than 10MB.");
      return;
    }

    setIsUploading(true);
    setProgress(0);
    let pct = 0;
    const ticker = setInterval(() => {
      pct = Math.min(pct + Math.random() * 15, 90);
      setProgress(Math.round(pct));
    }, 150);

    (async () => {
      try {
        const formData = new FormData();
        formData.set("file", file, file.name);
        const result = await uploadThemeBackgroundImageAction(themeKey, formData);
        clearInterval(ticker);
        if (!result.success) {
          setError(result.error);
          setProgress(0);
          return;
        }
        setProgress(100);
        setUploadedMeta({ name: file.name, size: file.size });
        onChange(result.url);
        toast.success("Background image uploaded.");
      } catch {
        clearInterval(ticker);
        setError("Upload failed. Please try again.");
        setProgress(0);
      } finally {
        setIsUploading(false);
      }
    })();
  }

  handleFileRef.current = handleFile;

  function openPicker() {
    inputRef.current?.click();
  }

  function handleRemove() {
    onChange("");
    setUploadedMeta(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasImage = Boolean(value) && !isUploading;
  const displayName = uploadedMeta?.name ?? (value ? guessFileName(value) : "");

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={cn(
          "relative overflow-hidden rounded-xl border transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/20",
          !hasImage && !isUploading && "border-dashed"
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <div className="w-full max-w-56 space-y-1.5">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground">Uploading… {progress}%</p>
            </div>
          </div>
        ) : hasImage ? (
          <div className="flex flex-col gap-3 p-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Background preview" className="size-full object-cover" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {[dimensions ? `${dimensions.width}×${dimensions.height}` : null, uploadedMeta ? formatBytes(uploadedMeta.size) : null]
                    .filter(Boolean)
                    .join(" · ") || "External image"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={openPicker}>
                  Replace Image
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={handleRemove} aria-label="Remove image">
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={openPicker}
            className="flex w-full flex-col items-center justify-center gap-3 px-6 py-10 text-center"
          >
            <ImageIcon className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drag &amp; drop an image here</p>
            <p className="text-xs text-muted-foreground">or</p>
            <span className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-sm font-medium text-primary-foreground">
              <Upload className="size-4" />
              Upload Image
            </span>
            <p className="text-xs text-muted-foreground">Supports JPG, PNG, WEBP, GIF (10 MB max)</p>
          </button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div>
        <button
          type="button"
          onClick={() => setShowUrlField((v) => !v)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight className={cn("size-3 transition-transform", showUrlField && "rotate-90")} />
          or use an external image URL
        </button>
        <AnimatePresence initial={false}>
          {showUrlField && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <Input
                className="mt-2"
                placeholder="https://example.com/background.jpg"
                value={value}
                onChange={(e) => {
                  setUploadedMeta(null);
                  onChange(e.target.value);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
