"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileDropzone, type DroppedFile } from "@/components/shared/file-dropzone";
import { uploadCampaignAttachment, deleteCampaignAttachment } from "@/features/agencies/services/campaign-actions";

type Attachment = { id: string; name: string; url: string; sizeBytes: number | null };

export function CampaignAttachmentsPanel({
  campaignId,
  attachments,
  canManage,
}: {
  campaignId: string;
  attachments: Attachment[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pendingFiles, setPendingFiles] = useState<DroppedFile[]>([]);
  const [isPending, startTransition] = useTransition();

  function upload() {
    if (pendingFiles.length === 0) return;
    startTransition(async () => {
      for (const { file } of pendingFiles) {
        const formData = new FormData();
        formData.set("file", file);
        const result = await uploadCampaignAttachment(campaignId, formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
      }
      setPendingFiles([]);
      router.refresh();
    });
  }

  function remove(fileId: string) {
    startTransition(async () => {
      const result = await deleteCampaignAttachment(fileId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
              <a href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:underline">
                <Paperclip className="size-3.5 text-muted-foreground" />
                {file.name}
              </a>
              {canManage && (
                <button
                  type="button"
                  onClick={() => remove(file.id)}
                  disabled={isPending}
                  className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <div className="space-y-2">
          <FileDropzone files={pendingFiles} onFilesChange={setPendingFiles} maxFiles={5} />
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
