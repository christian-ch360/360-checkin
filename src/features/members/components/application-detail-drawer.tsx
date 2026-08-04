"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Mail, Phone, Building2, Link2, Users2, CheckCircle2, XCircle } from "lucide-react";
import type { MemberRole } from "@prisma/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  fetchApplicationDetail,
  approveMemberAction,
  rejectMemberAction,
  assignMemberTypeAction,
  assignCommissionTierAction,
  addInternalNoteAction,
} from "@/features/members/services/approval-actions";
import { ROLE_LABELS, APPLICANT_ROLE_VALUES } from "@/features/members/role-labels";
import { instagramUrl, tiktokUrl, youtubeUrl, linkedinUrl } from "@/lib/utils/social-links";

type ApplicationDetail = Awaited<ReturnType<typeof fetchApplicationDetail>>;

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

export function ApplicationDetailDrawer({
  memberId,
  open,
  onOpenChange,
  onActioned,
}: {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActioned: () => void;
}) {
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [noteBody, setNoteBody] = useState("");

  useEffect(() => {
    if (!open || !memberId) {
      setDetail(null);
      setLoadError(null);
      setRejecting(false);
      setRejectionReason("");
      setNoteBody("");
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetchApplicationDetail(memberId)
      .then((d) => setDetail(d))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load application."))
      .finally(() => setLoading(false));
  }, [memberId, open]);

  function refetch() {
    if (!memberId) return;
    fetchApplicationDetail(memberId).then(setDetail).catch(() => {});
  }

  function handleApprove() {
    if (!memberId) return;
    startTransition(async () => {
      const result = await approveMemberAction(memberId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Member approved");
      onActioned();
    });
  }

  function handleReject() {
    if (!memberId) return;
    startTransition(async () => {
      const result = await rejectMemberAction(memberId, rejectionReason);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Application rejected");
      onActioned();
    });
  }

  function handleAssignRole(role: string) {
    if (!memberId) return;
    startTransition(async () => {
      const result = await assignMemberTypeAction(memberId, role as MemberRole);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      refetch();
    });
  }

  function handleAssignTier(tierId: string) {
    if (!memberId) return;
    startTransition(async () => {
      const result = await assignCommissionTierAction(memberId, tierId === "none" ? null : tierId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      refetch();
    });
  }

  function handleAddNote() {
    if (!memberId || !noteBody.trim()) return;
    startTransition(async () => {
      const result = await addInternalNoteAction(memberId, noteBody);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setNoteBody("");
      refetch();
    });
  }

  const member = detail?.member;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Application details</SheetTitle>
          <SheetDescription className="sr-only">Review and act on this member application.</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {loadError && <p className="text-sm text-destructive">{loadError}</p>}

          {member && (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  {member.profilePhotoUrl && <AvatarImage src={member.profilePhotoUrl} alt={member.fullName} />}
                  <AvatarFallback>{initials(member.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{member.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{member.memberNumber}</p>
                </div>
              </div>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Full Name" value={member.fullName} />
                  <Field
                    label="Email"
                    value={
                      <span className="flex items-center gap-1">
                        <Mail className="size-3.5 text-muted-foreground" /> {member.email}
                      </span>
                    }
                  />
                  <Field
                    label="Phone"
                    value={
                      member.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3.5 text-muted-foreground" /> {member.phone}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                  <Field
                    label="Company"
                    value={
                      member.company ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3.5 text-muted-foreground" /> {member.company.name}
                        </span>
                      ) : (
                        "—"
                      )
                    }
                  />
                </div>
                <Field label="Bio" value={member.bio || "—"} />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Social Links</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(
                      [
                        { label: "Instagram", href: instagramUrl(member.instagramUrl) },
                        { label: "TikTok", href: tiktokUrl(member.tiktokUrl) },
                        { label: "YouTube", href: youtubeUrl(member.youtubeUrl) },
                        { label: "LinkedIn", href: linkedinUrl(member.linkedinUrl) },
                      ] as const
                    ).map((link) =>
                      link.href ? (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Link2 className="size-3" /> {link.label}
                        </a>
                      ) : link.label === "Instagram" || link.label === "TikTok" ? (
                        <span
                          key={link.label}
                          className="flex cursor-not-allowed items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground/50"
                        >
                          <Link2 className="size-3" /> {link.label} — Not Connected
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Application Information
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Applied Member Type" value={ROLE_LABELS[member.role]} />
                  <Field label="Application Date" value={format(new Date(member.createdAt), "MMM d, yyyy 'at' h:mm a")} />
                  <Field
                    label="Email Verified"
                    value={
                      <span className="text-muted-foreground">
                        Not available (requires Supabase Admin API access)
                      </span>
                    }
                  />
                  <Field
                    label="QR Generated"
                    value={
                      member.qrAsset ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <XCircle className="size-3.5" /> No
                        </span>
                      )
                    }
                  />
                </div>
              </section>

              {member.role === "CREATOR" && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Creator Information
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Follower Count"
                        value={
                          member.followerCount != null ? (
                            <span className="flex items-center gap-1">
                              <Users2 className="size-3.5 text-muted-foreground" />
                              {member.followerCount.toLocaleString()}
                            </span>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Platforms</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {member.platforms.length > 0 ? (
                            member.platforms.map((p) => (
                              <Badge key={p} variant="outline">
                                {p}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm">—</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </>
              )}

              <Separator />

              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Role &amp; Commission Tier
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Role</p>
                    <Select value={member.role} onValueChange={handleAssignRole} disabled={isPending}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLICANT_ROLE_VALUES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Commission Tier</p>
                    <Select
                      value={member.commissionTierId ?? "none"}
                      onValueChange={handleAssignTier}
                      disabled={isPending}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {detail!.commissionTiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            {tier.name} — {tier.percentage.toString()}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Internal Notes
                </h3>
                <p className="text-xs text-muted-foreground">Private — never visible to the applicant.</p>
                <div className="space-y-2">
                  {member.notesReceived.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notes yet.</p>
                  ) : (
                    member.notesReceived.map((note) => (
                      <div key={note.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <p className="whitespace-pre-wrap">{note.body}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {note.author.fullName} · {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a private note…"
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    className="min-h-16"
                  />
                </div>
                <Button size="sm" variant="outline" onClick={handleAddNote} disabled={isPending || !noteBody.trim()}>
                  Add note
                </Button>
              </section>

              {(member.status === "PENDING" || member.status === "REJECTED") && (
                <>
                  <Separator />
                  <section className="space-y-3">
                    {rejecting ? (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Reason for rejection (required)…"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="min-h-20"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={isPending || !rejectionReason.trim()}
                            className="flex-1"
                          >
                            {isPending && <Loader2 className="size-4 animate-spin" />}
                            Confirm rejection
                          </Button>
                          <Button variant="outline" onClick={() => setRejecting(false)} disabled={isPending}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={handleApprove} disabled={isPending} className="flex-1">
                          {isPending && <Loader2 className="size-4 animate-spin" />}
                          Approve
                        </Button>
                        <Button variant="destructive" onClick={() => setRejecting(true)} disabled={isPending} className="flex-1">
                          Reject
                        </Button>
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
