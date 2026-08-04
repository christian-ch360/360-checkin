"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateApplicationStatus } from "@/features/collab-hub/services/application-actions";
import { startConversationWithApplicant } from "@/features/collab-hub/services/conversation-actions";
import { statusToneClass } from "@/lib/utils/status-colors";

const STATUS_STYLES: Record<string, string> = {
  PENDING: statusToneClass.warning,
  ACCEPTED: statusToneClass.success,
  REJECTED: statusToneClass.error,
  WITHDRAWN: statusToneClass.neutral,
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

type ApplicationItem = {
  id: string;
  message: string | null;
  status: string;
  createdAt: Date;
  applicant: { id: string; fullName: string; profilePhotoUrl: string | null; role: string };
};

export function ApplicationsPanel({ postId, applications }: { postId: string; applications: ApplicationItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function respond(applicationId: string, status: "ACCEPTED" | "REJECTED") {
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, status);
      if (!result.success) toast.error(result.error);
      else toast.success(status === "ACCEPTED" ? "Application accepted" : "Application rejected");
      router.refresh();
    });
  }

  function message(applicantId: string) {
    startTransition(async () => {
      const result = await startConversationWithApplicant(postId, applicantId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.push(`/messages/${result.conversationId}`);
    });
  }

  if (applications.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No applications yet.</p>;
  }

  return (
    <div className="divide-y">
      {applications.map((a) => (
        <div key={a.id} className="space-y-2 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Avatar className="size-9">
                {a.applicant.profilePhotoUrl && <AvatarImage src={a.applicant.profilePhotoUrl} />}
                <AvatarFallback className="text-xs">{initials(a.applicant.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium">{a.applicant.fullName}</p>
                <p className="text-xs text-muted-foreground">{format(a.createdAt, "MMM d, yyyy")}</p>
              </div>
            </div>
            <Badge variant="outline" className={STATUS_STYLES[a.status]}>
              {a.status}
            </Badge>
          </div>
          {a.message && <p className="pl-12 text-sm text-muted-foreground">{a.message}</p>}
          <div className="flex gap-2 pl-12">
            {a.status === "PENDING" && (
              <>
                <Button size="sm" onClick={() => respond(a.id, "ACCEPTED")} disabled={isPending}>
                  Accept
                </Button>
                <Button size="sm" variant="outline" onClick={() => respond(a.id, "REJECTED")} disabled={isPending}>
                  Reject
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={() => message(a.applicant.id)} disabled={isPending}>
              Message
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
