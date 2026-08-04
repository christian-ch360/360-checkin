import Link from "next/link";
import { format } from "date-fns";
import { FileText, Link as LinkIcon, Mic, DoorOpen, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export type MessageItem = {
  id: string;
  type: string;
  body: string | null;
  attachmentUrl: string | null;
  createdAt: Date;
  sender: { id: string; fullName: string; profilePhotoUrl: string | null };
  projectRef: { id: string; name: string; status: string } | null;
  reservationRef: { id: string; startTime: Date; endTime: Date; space: { name: string } } | null;
};

export function MessageBubble({
  message,
  isOwn,
  isRead,
}: {
  message: MessageItem;
  isOwn: boolean;
  isRead?: boolean;
}) {
  return (
    <div className={cn("flex items-end gap-2", isOwn && "flex-row-reverse")}>
      <Avatar className="size-7 shrink-0">
        {message.sender.profilePhotoUrl && <AvatarImage src={message.sender.profilePhotoUrl} />}
        <AvatarFallback className="text-[10px]">{initials(message.sender.fullName)}</AvatarFallback>
      </Avatar>
      <div className={cn("max-w-[75%] space-y-1", isOwn && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-3 py-2 text-sm",
            isOwn ? "bg-primary text-primary-foreground" : "bg-muted"
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
              className="max-w-full rounded-lg"
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
          {message.type === "PROJECT_REF" && message.projectRef && (
            <Link href={`/projects/${message.projectRef.id}`} className="flex items-center gap-2 underline">
              <LinkIcon className="size-4 shrink-0" /> {message.projectRef.name}
            </Link>
          )}
          {message.type === "RESERVATION_REF" && message.reservationRef && (
            <Link href="/spaces" className="flex items-center gap-2 underline">
              <DoorOpen className="size-4 shrink-0" />
              {message.reservationRef.space.name} · {format(message.reservationRef.startTime, "MMM d, h:mm a")}
            </Link>
          )}
          {message.type === "VOICE" && (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Mic className="size-4" /> Voice message
            </span>
          )}
        </div>
        <p
          className={cn(
            "flex items-center gap-1 text-[10px] text-muted-foreground",
            isOwn && "flex-row-reverse"
          )}
        >
          {format(message.createdAt, "h:mm a")}
          {isOwn &&
            (isRead ? (
              <span className="flex items-center gap-0.5 text-primary">
                <CheckCheck className="size-3" /> Read
              </span>
            ) : (
              <Check className="size-3" />
            ))}
        </p>
      </div>
    </div>
  );
}
