"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Paperclip, Mic, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPopover } from "@/features/collab-hub/components/emoji-popover";
import { sendDirectMessage, setDirectTyping } from "@/features/messaging/services/conversation-actions";

type AttachMode = "image" | "file" | null;

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachMode, setAttachMode] = useState<AttachMode>(null);
  const [attachUrl, setAttachUrl] = useState("");
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

  async function sendAttachment() {
    if (!attachMode || !attachUrl.trim()) return;
    setSending(true);
    const result = await sendDirectMessage(conversationId, {
      type: attachMode === "image" ? "IMAGE" : "FILE",
      attachmentUrl: attachUrl.trim(),
    });
    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setAttachMode(null);
    setAttachUrl("");
    setAttachOpen(false);
    onSent();
  }

  return (
    <div className="border-t p-3">
      {attachMode && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
          <Input
            placeholder={attachMode === "image" ? "Paste image URL" : "Paste file URL"}
            value={attachUrl}
            onChange={(e) => setAttachUrl(e.target.value)}
            className="h-8"
          />
          <Button size="sm" onClick={sendAttachment} disabled={sending}>
            Send
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAttachMode(null)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex items-center gap-1">
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-1" align="start">
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                setAttachMode("image");
                setAttachOpen(false);
              }}
            >
              <ImageIcon className="size-4" /> Image URL
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                setAttachMode("file");
                setAttachOpen(false);
              }}
            >
              <FileText className="size-4" /> File URL
            </button>
          </PopoverContent>
        </Popover>

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
