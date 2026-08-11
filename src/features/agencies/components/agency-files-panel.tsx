"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderOpen, FolderPlus, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropzone, type DroppedFile } from "@/components/shared/file-dropzone";
import { createFolder, deleteFolder, uploadFileToFolder, deleteAgencyFile } from "@/features/agencies/services/agency-file-actions";
import type { FolderVisibility } from "@prisma/client";

type Folder = { id: string; name: string };
type FileRow = { id: string; name: string; url: string; uploadedBy: { fullName: string } | null };

export function NewFolderDialog({ parentFolderId }: { parentFolderId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<FolderVisibility>("AGENCY_ONLY");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <FolderPlus className="size-4" /> New folder
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>Organize agency files by visibility.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input placeholder="Folder name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={visibility} onValueChange={(v) => setVisibility(v as FolderVisibility)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AGENCY_ONLY">Agency only</SelectItem>
              <SelectItem value="SHARED_WITH_CREATORS">Shared with creators</SelectItem>
              <SelectItem value="SHARED_WITH_BRAND">Shared with brand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            className="w-full"
            disabled={!name.trim() || isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await createFolder({ name: name.trim(), parentFolderId, visibility });
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                setName("");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Create folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FolderList({ folders, canManage }: { folders: Folder[]; canManage: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (folders.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {folders.map((folder) => (
        <li key={folder.id} className="group relative flex items-center gap-2 rounded-lg border p-3">
          <a href={`/agency/files?folder=${folder.id}`} className="flex min-w-0 flex-1 items-center gap-2">
            <FolderOpen className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{folder.name}</span>
          </a>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                if (!confirm(`Delete folder "${folder.name}"? It must be empty.`)) return;
                startTransition(async () => {
                  const result = await deleteFolder(folder.id);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  router.refresh();
                });
              }}
              disabled={isPending}
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function FileList({ files, folderId, canManage }: { files: FileRow[]; folderId: string | null; canManage: boolean }) {
  const router = useRouter();
  const [pendingFiles, setPendingFiles] = useState<DroppedFile[]>([]);
  const [isPending, startTransition] = useTransition();

  function upload() {
    if (pendingFiles.length === 0) return;
    startTransition(async () => {
      for (const { file } of pendingFiles) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadFileToFolder(folderId, formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      }
      setPendingFiles([]);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {files.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files here yet.</p>
      ) : (
        <ul className="space-y-2">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <a href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                <Paperclip className="size-3.5 text-muted-foreground" />
                {file.name}
              </a>
              <div className="flex items-center gap-2">
                {file.uploadedBy && <span className="text-xs text-muted-foreground">{file.uploadedBy.fullName}</span>}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      startTransition(async () => {
                        const result = await deleteAgencyFile(file.id);
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        router.refresh();
                      });
                    }}
                    disabled={isPending}
                    className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="space-y-2">
          <FileDropzone files={pendingFiles} onFilesChange={setPendingFiles} maxFiles={10} />
          {pendingFiles.length > 0 && (
            <Button size="sm" onClick={upload} disabled={isPending}>
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <UploadCloud className="size-3.5" />}
              Upload {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

