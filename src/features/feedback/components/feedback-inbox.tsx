"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { updateFeedbackStatus } from "@/features/feedback/services/actions";
import { feedbackStatusValues } from "@/features/feedback/schemas/feedback.schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
};

const STATUS_STYLES: Record<string, string> = {
  OPEN: statusToneClass.warning,
  IN_REVIEW: statusToneClass.info,
  RESOLVED: statusToneClass.success,
};

const CATEGORY_LABELS: Record<string, string> = {
  PLATFORM: "Platform",
  FACILITY: "Facility",
  OTHER: "Other",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type FeedbackItem = {
  id: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  createdAt: Date;
  member: { id: string; fullName: string; profilePhotoUrl: string | null };
};

export function FeedbackInbox({ items }: { items: FeedbackItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeStatus(id: string, status: string) {
    startTransition(async () => {
      const result = await updateFeedbackStatus(id, status);
      if (!result.success) toast.error(result.error);
      router.refresh();
    });
  }

  if (items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No feedback submitted yet.</p>;
  }

  return (
    <div className="divide-y">
      {items.map((item) => (
        <div key={item.id} className="space-y-2 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Avatar className="size-8">
                {item.member.profilePhotoUrl && <AvatarImage src={item.member.profilePhotoUrl} />}
                <AvatarFallback className="text-xs">{initials(item.member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium">{item.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {item.member.fullName} · {format(item.createdAt, "MMM d, yyyy")} ·{" "}
                  <Badge variant="outline" className="ml-0.5 text-[10px]">
                    {CATEGORY_LABELS[item.category]}
                  </Badge>
                </p>
              </div>
            </div>
            <Select value={item.status} onValueChange={(v) => changeStatus(item.id, v)} disabled={isPending}>
              <SelectTrigger className="w-36 shrink-0">
                <SelectValue>
                  <Badge variant="outline" className={STATUS_STYLES[item.status]}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {feedbackStatusValues.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="pl-11 text-sm text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </div>
  );
}
