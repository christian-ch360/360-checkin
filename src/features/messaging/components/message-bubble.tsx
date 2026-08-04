import { format } from "date-fns";
import { FileText, Mic, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export type DirectMessageItem = {
  id: string;
  type: string;
  body: string | null;
  attachmentUrl: string | null;
  createdAt: Date;
  sender: { id: string; fullName: string; profilePhotoUrl: string | null };
};

export function MessageBubble({
  message,
  isOwn,
  isRead,
  showMeta,
}: {
  message: DirectMessageItem;
  isOwn: boolean;
  isRead?: boolean;
  /** False when this message is grouped under a previous one from the same sender — hides the avatar/timestamp for a tighter iMessage-style run. */
  showMeta: boolean;
}) {
  return (
    <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse", !showMeta && "mt-0.5")}>
      <div className="size-7 shrink-0">
        {!isOwn && showMeta && (
          <Avatar className="size-7">
            {message.sender.profilePhotoUrl && <AvatarImage src={message.sender.profilePhotoUrl} />}
            <AvatarFallback className="text-[10px]">{initials(message.sender.fullName)}</AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className={cn("max-w-[75%] space-y-1", isOwn && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-3xl px-4 py-2 text-sm",
            isOwn ? "bg-info text-info-foreground" : "bg-muted"
          )}
        >
          {message.type === "TEXT" && <p className="whitespace-pre-wrap">{message.body}</p>}
          {message.type === "IMAGE" && message.attachmentUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.attachmentUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="max-w-full rounded-2xl"
            />
          )}
          {message.type === "FILE" && message.attachmentUrl && (
            <a
              href={message.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 underline"
            >
              <FileText className="size-4 shrink-0" /> {message.body || "Attached file"}
            </a>
          )}
          {message.type === "VOICE" && (
            <span className="flex items-center gap-2 opacity-70">
              <Mic className="size-4" /> Voice message
            </span>
          )}
        </div>
        {showMeta && (
          <p
            className={cn(
              "flex items-center gap-1 text-[10px] text-muted-foreground",
              isOwn && "flex-row-reverse"
            )}
          >
            {format(message.createdAt, "h:mm a")}
            {isOwn &&
              (isRead ? (
                <span className="flex items-center gap-0.5 text-info">
                  <CheckCheck className="size-3" /> Read
                </span>
              ) : (
                <Check className="size-3" />
              ))}
          </p>
        )}
      </div>
    </div>
  );
}
