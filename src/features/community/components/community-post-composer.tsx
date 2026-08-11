"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, HelpCircle, Handshake, Trophy, Users, Megaphone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MentionAutocomplete } from "@/features/community/components/mention-autocomplete";
import { FileDropzone, type DroppedFile } from "@/components/shared/file-dropzone";
import { createCommunityPost } from "@/features/community/services/community-post-actions";
import type { CommunityPostType } from "@prisma/client";

const POST_TYPES: { value: CommunityPostType; label: string; icon: typeof Sparkles }[] = [
  { value: "UPDATE", label: "Update", icon: Sparkles },
  { value: "QUESTION", label: "Question", icon: HelpCircle },
  { value: "OPPORTUNITY", label: "Opportunity", icon: Handshake },
  { value: "WIN", label: "Win", icon: Trophy },
  { value: "COLLABORATION", label: "Collaboration", icon: Users },
  { value: "ANNOUNCEMENT", label: "Announcement", icon: Megaphone },
];

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CommunityPostComposer({
  authorName,
  authorPhotoUrl,
  canAnnounce,
}: {
  authorName: string;
  authorPhotoUrl: string | null;
  canAnnounce: boolean;
}) {
  const router = useRouter();
  const [type, setType] = useState<CommunityPostType>("UPDATE");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setPosting(true);

    const formData = new FormData();
    formData.set("type", type);
    formData.set("body", body.trim());
    for (const f of files) formData.append("files", f.file);

    const result = await createCommunityPost(formData);
    setPosting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setBody("");
    setFiles([]);
    setExpanded(false);
    toast.success(type === "ANNOUNCEMENT" ? "Announcement posted" : "Posted to Community");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex gap-3">
        <Avatar className="size-9 shrink-0">
          {authorPhotoUrl && <AvatarImage src={authorPhotoUrl} />}
          <AvatarFallback>{initials(authorName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-3">
          <MentionAutocomplete
            value={body}
            onChange={setBody}
            placeholder="Share an update, ask a question, celebrate a win…"
            rows={expanded ? 4 : 2}
            className="resize-none"
          />
          {(expanded || body) && (
            <>
              <FileDropzone
                files={files}
                onFilesChange={setFiles}
                accept="image/*,video/*,application/pdf,.doc,.docx"
                maxFiles={6}
                disabled={posting}
                label="Drop images, video, PDFs, or docs"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Select value={type} onValueChange={(v) => setType(v as CommunityPostType)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.filter((t) => t.value !== "ANNOUNCEMENT" || canAnnounce).map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <t.icon className="size-3.5" /> {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={submit} disabled={posting || !body.trim()}>
                  {posting ? "Posting…" : "Post"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      {!expanded && !body && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-2 w-full text-left text-xs text-muted-foreground"
        >
          Click to add a post type, attachments…
        </button>
      )}
    </div>
  );
}
