"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Send, Paperclip, Mic, Image as ImageIcon, FileText, Link as LinkIcon, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmojiPopover } from "@/features/collab-hub/components/emoji-popover";
import { sendMessage, setTyping } from "@/features/collab-hub/services/conversation-actions";

type AttachMode = "image" | "file" | "project" | "reservation" | null;

export function MessageComposer({
  conversationId,
  projects,
  reservations,
  onSent,
}: {
  conversationId: string;
  projects: { id: string; name: string }[];
  reservations: { id: string; label: string }[];
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachMode, setAttachMode] = useState<AttachMode>(null);
  const [attachUrl, setAttachUrl] = useState("");
  const [attachId, setAttachId] = useState("");
  const lastTypingRef = useRef(0);

  function handleTextChange(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTypingRef.current > 2500) {
      lastTypingRef.current = now;
      setTyping(conversationId).catch(() => {});
    }
  }

  async function sendText() {
    if (!text.trim()) return;
    setSending(true);
    const result = await sendMessage(conversationId, { type: "TEXT", body: text.trim() });
    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setText("");
    onSent();
  }

  async function sendAttachment() {
    if ((attachMode === "image" || attachMode === "file") && !attachUrl.trim()) return;
    if ((attachMode === "project" || attachMode === "reservation") && !attachId) return;

    setSending(true);
    const result =
      attachMode === "image" || attachMode === "file"
        ? await sendMessage(conversationId, {
            type: attachMode === "image" ? "IMAGE" : "FILE",
            attachmentUrl: attachUrl.trim(),
          })
        : attachMode === "project"
          ? await sendMessage(conversationId, { type: "PROJECT_REF", projectRefId: attachId })
          : await sendMessage(conversationId, { type: "RESERVATION_REF", reservationRefId: attachId });

    setSending(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setAttachMode(null);
    setAttachUrl("");
    setAttachId("");
    setAttachOpen(false);
    onSent();
  }

  return (
    <div className="border-t p-3">
      {attachMode && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
          {(attachMode === "image" || attachMode === "file") && (
            <Input
              placeholder={attachMode === "image" ? "Paste image URL" : "Paste file URL"}
              value={attachUrl}
              onChange={(e) => setAttachUrl(e.target.value)}
              className="h-8"
            />
          )}
          {attachMode === "project" && (
            <Select value={attachId} onValueChange={setAttachId}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {attachMode === "reservation" && (
            <Select value={attachId} onValueChange={setAttachId}>
              <SelectTrigger size="sm" className="w-full">
                <SelectValue placeholder="Choose a reservation" />
              </SelectTrigger>
              <SelectContent>
                {reservations.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <PopoverContent className="w-56 p-1" align="start">
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
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                setAttachMode("project");
                setAttachOpen(false);
              }}
            >
              <LinkIcon className="size-4" /> Link a project
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              onClick={() => {
                setAttachMode("reservation");
                setAttachOpen(false);
              }}
            >
              <DoorOpen className="size-4" /> Link a space reservation
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
          className="h-10 flex-1"
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

        <Button type="button" size="icon" onClick={sendText} disabled={sending || !text.trim()} className="shrink-0">
          <Send className="size-4" />
        </Button>
      </div>
      <Badge variant="outline" className="mt-1.5 text-[10px] font-normal text-muted-foreground">
        Voice messages: coming soon
      </Badge>
    </div>
  );
}
