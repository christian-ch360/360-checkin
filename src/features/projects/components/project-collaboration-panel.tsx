"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Check, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { inviteBrandToProject } from "@/features/projects/services/invitation-actions";
import {
  requestToJoinProject,
  acceptCollaborationRequest,
  rejectCollaborationRequest,
} from "@/features/projects/services/collaboration-request-actions";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  roleLabel: z.string().trim().min(1, "Enter a role"),
});
type InviteInput = z.infer<typeof inviteSchema>;

function InviteBrandDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", roleLabel: "" },
  });

  function onSubmit(values: InviteInput) {
    startTransition(async () => {
      const result = await inviteBrandToProject(projectId, values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Invitation sent");
      form.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Invite brand
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a brand to collaborate</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="brand@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="roleLabel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Sponsoring brand" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RequestToJoinButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    startTransition(async () => {
      const result = await requestToJoinProject(projectId, message || undefined);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Request sent");
      setOpen(false);
      setMessage("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Request to join
        </Button>
      </DialogTrigger>
      <DialogContent mobileFullscreen className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request to join this project</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Add a note (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button onClick={handleSend} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type PendingRequest = {
  id: string;
  message: string | null;
  member: { id: string; fullName: string; profilePhotoUrl: string | null; role: string };
};

type PendingInvitation = { id: string; email: string; roleLabel: string; expiresAt: Date };

export function ProjectCollaborationPanel({
  projectId,
  canManage,
  canRequestToJoin,
  pendingRequests,
  pendingInvitations,
}: {
  projectId: string;
  canManage: boolean;
  canRequestToJoin: boolean;
  pendingRequests: PendingRequest[];
  pendingInvitations: PendingInvitation[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function respond(requestId: string, accept: boolean) {
    startTransition(async () => {
      const action = accept ? acceptCollaborationRequest : rejectCollaborationRequest;
      const result = await action(requestId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(accept ? "Request accepted" : "Request declined");
      router.refresh();
    });
  }

  if (!canManage && !canRequestToJoin) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {canManage && <InviteBrandDialog projectId={projectId} />}
        {canRequestToJoin && <RequestToJoinButton projectId={projectId} />}
      </div>

      {canManage && pendingRequests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Collaboration requests
          </p>
          {pendingRequests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Avatar className="size-8 shrink-0">
                {req.member.profilePhotoUrl && <AvatarImage src={req.member.profilePhotoUrl} />}
                <AvatarFallback className="text-xs">{initials(req.member.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{req.member.fullName}</p>
                {req.message && <p className="truncate text-xs text-muted-foreground">{req.message}</p>}
              </div>
              <Button size="icon" variant="outline" disabled={isPending} onClick={() => respond(req.id, true)}>
                <Check className="size-3.5" />
              </Button>
              <Button size="icon" variant="outline" disabled={isPending} onClick={() => respond(req.id, false)}>
                <X className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {canManage && pendingInvitations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pending invitations</p>
          {pendingInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span className="truncate">{inv.email}</span>
              <Badge variant="outline">{inv.roleLabel}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
