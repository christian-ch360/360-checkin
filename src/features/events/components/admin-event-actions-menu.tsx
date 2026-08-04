"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { MoreHorizontal, Copy, Star, StarOff, Archive, Download, BarChart3, Ban, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  duplicateEvent,
  featureEvent,
  archiveEvent,
  cancelEvent,
  deleteEvent,
} from "@/features/events/services/event-actions";
import type { EventStatus } from "@prisma/client";

export function AdminEventActionsMenu({
  eventId,
  status,
  isFeatured,
}: {
  eventId: string;
  status: EventStatus;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={isPending}>
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/events/${eventId}/edit`}>
            <Pencil className="size-3.5" /> Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run(() => duplicateEvent(eventId), "Duplicated as a new draft")}>
          <Copy className="size-3.5" /> Duplicate
        </DropdownMenuItem>
        {status === "PUBLISHED" && (
          <DropdownMenuItem
            onSelect={() =>
              run(() => featureEvent(eventId, !isFeatured), isFeatured ? "Unfeatured" : "Featured on kiosk")
            }
          >
            {isFeatured ? <StarOff className="size-3.5" /> : <Star className="size-3.5" />}
            {isFeatured ? "Unfeature" : "Feature on kiosk"}
          </DropdownMenuItem>
        )}
        {status === "PUBLISHED" && (
          <DropdownMenuItem asChild>
            <a href={`/api/events/${eventId}/export`} download>
              <Download className="size-3.5" /> Export attendees
            </a>
          </DropdownMenuItem>
        )}
        {status === "PUBLISHED" && (
          <DropdownMenuItem asChild>
            <a href={`/events/${eventId}`}>
              <BarChart3 className="size-3.5" /> View / analytics
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {status === "PUBLISHED" && (
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => run(() => cancelEvent(eventId), "Event cancelled")}
          >
            <Ban className="size-3.5" /> Cancel
          </DropdownMenuItem>
        )}
        <DropdownMenuItem variant="destructive" onSelect={() => run(() => archiveEvent(eventId), "Archived")}>
          <Archive className="size-3.5" /> Archive
        </DropdownMenuItem>
        {status === "DRAFT" && (
          <DropdownMenuItem variant="destructive" onSelect={() => run(() => deleteEvent(eventId), "Deleted")}>
            <Trash2 className="size-3.5" /> Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
