"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Search, Loader2, Check, X, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { approveCreatorRequestAction, rejectCreatorRequestAction } from "@/features/referrals/services/referral-actions";
import type { PendingCreatorRequest } from "@/features/referrals/services/referral.service";

type SortKey = "newest" | "oldest" | "name";

export function PendingRequestsCard({ requests }: { requests: PendingCreatorRequest[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [isPending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingCreatorRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matched = term
      ? requests.filter((r) => r.fullName.toLowerCase().includes(term) || r.email.toLowerCase().includes(term))
      : requests;
    return [...matched].sort((a, b) => {
      if (sort === "name") return a.fullName.localeCompare(b.fullName);
      if (sort === "oldest") return a.requestedAt.getTime() - b.requestedAt.getTime();
      return b.requestedAt.getTime() - a.requestedAt.getTime();
    });
  }, [requests, search, sort]);

  function handleApprove(request: PendingCreatorRequest) {
    setActingOn(request.referralLinkId);
    startTransition(async () => {
      const result = await approveCreatorRequestAction(request.referralLinkId);
      setActingOn(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${request.fullName} is now connected.`);
      router.refresh();
    });
  }

  function handleReject() {
    if (!rejecting) return;
    const target = rejecting;
    setActingOn(target.referralLinkId);
    startTransition(async () => {
      const result = await rejectCreatorRequestAction(target.referralLinkId, rejectNote);
      setActingOn(null);
      setRejecting(null);
      setRejectNote("");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`Request from ${target.fullName} declined.`);
      router.refresh();
    });
  }

  const socialCount = (r: PendingCreatorRequest) => [r.instagramUrl, r.tiktokUrl, r.youtubeUrl].filter(Boolean).length;

  return (
    <>
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Pending Creator Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={requests.length === 0 ? "No pending requests" : "No matches"}
              description={
                requests.length === 0
                  ? "Creators who manually enter your Agency ID will show up here for your approval."
                  : "Try a different search term."
              }
            />
          ) : (
            <div className="space-y-3">
              {filtered.map((request) => (
                <div
                  key={request.referralLinkId}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{request.fullName}</span>
                      <Badge variant="outline" className="text-xs">{ROLE_LABELS[request.role]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{request.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {socialCount(request) > 0 ? `${socialCount(request)} social account${socialCount(request) === 1 ? "" : "s"}` : "No social accounts linked"}
                      {request.followerCount != null && ` · ${request.followerCount.toLocaleString()} followers`}
                      {" · Requested "}
                      {format(request.requestedAt, "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending && actingOn === request.referralLinkId}
                      onClick={() => setRejecting(request)}
                    >
                      <X className="size-4" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={isPending && actingOn === request.referralLinkId}
                      onClick={() => handleApprove(request)}
                    >
                      {isPending && actingOn === request.referralLinkId ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(rejecting)} onOpenChange={(open) => !open && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject {rejecting?.fullName}&apos;s request?</AlertDialogTitle>
            <AlertDialogDescription>
              No agency relationship will be created. They&apos;ll be notified and can request a different agency.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Optional note (not shown to the creator)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
          />
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Reject request
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
