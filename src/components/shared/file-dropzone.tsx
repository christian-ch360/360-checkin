"use client";

import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { FileText, Film, Image as ImageIcon, Paperclip, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type DroppedFile = {
  file: File;
  previewUrl: string | null;
};

function iconFor(file: File) {
  if (file.type.startsWith("image/")) return ImageIcon;
  if (file.type.startsWith("video/")) return Film;
  if (file.type === "application/pdf") return FileText;
  return Paperclip;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Generalized multi-file, mixed-type drag/drop picker — same drag-handler
 * shape as member-avatar-upload.tsx's single-image dropzone, extended for
 * multiple files and arbitrary accepted types. Purely a client-side picker:
 * it validates and previews, then hands the selected File[] up via
 * onFilesChange — the caller decides how/when to actually upload them.
 */
export function FileDropzone({
  files,
  onFilesChange,
  accept,
  maxFiles = 6,
  maxSizeBytes = 25 * 1024 * 1024,
  disabled = false,
  label = "Drop files here, or click to browse",
}: {
  files: DroppedFile[];
  onFilesChange: (files: DroppedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSizeBytes?: number;
  disabled?: boolean;
  label?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    const list = Array.from(incoming);
    if (list.length === 0) return;

    if (files.length + list.length > maxFiles) {
      toast.error(`You can attach up to ${maxFiles} files.`);
      return;
    }

    const accepted: DroppedFile[] = [];
    for (const file of list) {
      if (file.size > maxSizeBytes) {
        toast.error(`"${file.name}" is too large (max ${formatBytes(maxSizeBytes)}).`);
        continue;
      }
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      accepted.push({ file, previewUrl });
    }
    if (accepted.length > 0) onFilesChange([...files, ...accepted]);
  }

  function removeAt(index: number) {
    const target = files[index];
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    onFilesChange(files.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground transition-colors",
          isDragging && "border-primary bg-primary/5 text-foreground",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <UploadCloud className="size-5" />
        <span>{label}</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={accept}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((f, i) => {
            const Icon = iconFor(f.file);
            return (
              <li
                key={`${f.file.name}-${f.file.lastModified}-${i}`}
                className="group relative flex items-center gap-2 rounded-md border bg-card py-1.5 pr-7 pl-2 text-xs"
              >
                {f.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.previewUrl} alt={f.file.name} className="size-6 rounded object-cover" />
                ) : (
                  <Icon className="size-4 text-muted-foreground" />
                )}
                <span className="max-w-[10rem] truncate">{f.file.name}</span>
                <span className="text-muted-foreground">{formatBytes(f.file.size)}</span>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute top-1/2 right-1 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${f.file.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
