"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus } from "lucide-react";
import type { AgencyMemberRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { inviteAgencyTeamMemberAction } from "@/features/agencies/services/agency-actions";

/** "Invite Team Member" — Owner or Manager, gated both here (role options offered) and
 * server-side (inviteAgencyTeamMemberAction re-checks canInviteRole regardless). */
export function InviteTeamMemberDialog({ actorRole }: { actorRole: AgencyMemberRole | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AgencyMemberRole>("STAFF");
  const [error, setError] = useState<string | null>(null);

  const canInviteOwner = actorRole === "OWNER";

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await inviteAgencyTeamMemberAction(fullName, email, role);
      if (!result.success) {
        setError(result.error);
        return;
      }
      toast.success(`Invitation sent to ${email}.`);
      setOpen(false);
      setFullName("");
      setEmail("");
      setRole("STAFF");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="size-4" />
          Invite Team Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a link to sign in or create an account, then join your team
            automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="invite-full-name">Full name</Label>
            <Input id="invite-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Creator" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@agency.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Agency role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as AgencyMemberRole)}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canInviteOwner && <SelectItem value="OWNER">Owner</SelectItem>}
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !fullName.trim() || !email.trim()}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
