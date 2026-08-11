"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Paperclip, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmojiPopover } from "@/features/collab-hub/components/emoji-popover";
import { FileDropzone, type DroppedFile } from "@/components/shared/file-dropzone";
import {
  sendDirectMessage,
  sendDirectMessageAttachment,
  setDirectTyping,
} from "@/features/messaging/services/conversation-actions";

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<DroppedFile[]>([]);
  const lastTypingRef = useRef(0);

  function handleTextChange(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTypingRef.current > 2500) {
      lastTypingRef.current = now;
      setDirectTyping(conversationId).catch(() => {});
    }
  }

  async function sendText() {
    if (!text.trim()) return;
    setSending(true);
    const result = await sendDirectMessage(conversationId, { type: "TEXT", body: text.trim() });
    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setText("");
    onSent();
  }

  async function sendAttachments() {
    if (pendingFiles.length === 0) return;
    setSending(true);
    for (const { file } of pendingFiles) {
      const formData = new FormData();
      formData.set("file", file);
      const result = await sendDirectMessageAttachment(conversationId, formData);
      if (!result.success) toast.error(result.error);
    }
    setSending(false);
    setPendingFiles([]);
    setAttachOpen(false);
    onSent();
  }

  return (
    <div className="border-t p-3">
      {attachOpen && (
        <div className="mb-2 space-y-2 rounded-lg border bg-muted/30 p-2">
          <FileDropzone
            files={pendingFiles}
            onFilesChange={setPendingFiles}
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
            maxFiles={4}
            disabled={sending}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAttachOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={sendAttachments} disabled={sending || pendingFiles.length === 0}>
              Send
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setAttachOpen((v) => !v)}
        >
          <Paperclip className="size-4" />
        </Button>

        <EmojiPopover onSelect={(e) => handleTextChange(text + e)} />

        <Input
          placeholder="Message..."
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendText();
            }
          }}
          className="h-10 flex-1 rounded-full"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled
          className="shrink-0"
          title="Voice messages coming soon"
        >
          <Mic className="size-4" />
        </Button>

        <Button
          type="button"
          size="icon"
          onClick={sendText}
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-full"
        >
          <Send className="size-4" />
        </Button>
      </div>
      <Badge variant="outline" className="mt-1.5 text-[10px] font-normal text-muted-foreground">
        Voice messages: coming soon
      </Badge>
    </div>
  );
}
