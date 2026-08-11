"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Check, X, Mail, Phone, Building2, MapPin, Camera, ExternalLink } from "lucide-react";
import type { MemberRole, MembershipApplicationStatus } from "@prisma/client";
import {
  approveApplicationAction,
  rejectApplicationAction,
  updateApplicationNotesAction,
} from "@/features/applications/services/review-actions";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { ApplicationHistory, type ApplicationHistoryEntry } from "@/features/applications/components/application-history";
import { instagramUrl, tiktokUrl, youtubeUrl, isNoAccountValue } from "@/lib/utils/social-links";
import { formatLocation } from "@/features/applications/utils/location";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ApplicationDetail = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: MemberRole;
  company: string | null;
  website: string | null;
  businessRegistrationNumber: string | null;
  instagram: string | null;
  tiktok: string | null;
  youtube: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  referredBy: string | null;
  status: MembershipApplicationStatus;
  notes: string | null;
  notesUpdatedAt: string | null;
  notesUpdatedBy: { id: string; fullName: string } | null;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: { id: string; fullName: string } | null;
};

function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0 w-full">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm break-words">{value}</p>
    </div>
  );
}

// `url`: the clickable link, if one could be built. `rawValue`: what the
// applicant actually typed — shown as plain text when a link couldn't be
// built but something was submitted (YouTube's "otherwise display the
// submitted value" case). "Not Provided" only when the field was empty.
function SocialField({ label, url, rawValue }: { label: string; url: string | null; rawValue: string | null }) {
  return (
    <div className="min-w-0 w-full">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1 text-sm font-medium text-primary break-words hover:underline"
        >
          <span className="break-words">{label}</span>
          <ExternalLink className="size-3 shrink-0" />
        </a>
      ) : isNoAccountValue(rawValue) ? (
        <p className="text-sm text-muted-foreground">No {label} Account</p>
      ) : rawValue ? (
        <p className="text-sm break-words">{rawValue}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Not Provided</p>
      )}
    </div>
  );
}

const NOTES_SAVE_DEBOUNCE_MS = 1000;

export function ApplicationReview({
  application,
  history,
}: {
  application: ApplicationDetail;
  history: ApplicationHistoryEntry[];
}) {
  const router = useRouter();
  const location = formatLocation(application.city, application.state, application.country);
  const [notes, setNotes] = useState(application.notes ?? "");
  const [notesUpdatedAt, setNotesUpdatedAt] = useState(application.notesUpdatedAt);
  const [notesUpdatedByName, setNotesUpdatedByName] = useState(application.notesUpdatedBy?.fullName ?? null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isPendingStatus = application.status === "PENDING";
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function saveNotes(value: string) {
    setSaveState("saving");
    startTransition(async () => {
      const result = await updateApplicationNotesAction(application.id, value);
      if (!result.success) {
        toast.error(result.error);
        setSaveState("idle");
        return;
      }
      setNotesUpdatedAt(result.updatedAt);
      setNotesUpdatedByName(result.updatedByName);
      setSaveState("saved");
    });
  }

  function onNotesChange(value: string) {
    setNotes(value);
    setSaveState("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(value), NOTES_SAVE_DEBOUNCE_MS);
  }

  function onApprove() {
    startTransition(async () => {
      const result = await approveApplicationAction(application.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setApproveOpen(false);
      if (result.onboardingNote) {
        toast.info(result.onboardingNote);
      }
      toast.success(`${application.fullName} approved — member account created.`);
      router.refresh();
    });
  }

  function onRejectClick() {
    if (!notes.trim()) {
      toast.error("Add an internal rejection reason in Notes before rejecting.");
      return;
    }
    setRejectOpen(true);
  }

  function onConfirmReject() {
    startTransition(async () => {
      const result = await rejectApplicationAction(application.id, notes);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setRejectOpen(false);
      toast.success(`${application.fullName}'s application rejected.`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Full name" value={application.fullName} />
            <Field label="Role" value={ROLE_LABELS[application.role]} />
            <Field label="Email" value={application.email} />
            <Field label="Phone" value={application.phone} />
            <Field label="Company" value={application.company} />
            <Field label="Website" value={application.website} />
            <Field label="Business registration #" value={application.businessRegistrationNumber} />
            <Field label="Location" value={location} />
            <Field label="Referral" value={application.referredBy} />
            <SocialField label="Instagram" url={instagramUrl(application.instagram)} rawValue={application.instagram} />
            <SocialField label="TikTok" url={tiktokUrl(application.tiktok)} rawValue={application.tiktok} />
            <SocialField label="YouTube" url={youtubeUrl(application.youtube)} rawValue={application.youtube} />
            <Field label="Applied" value={format(new Date(application.createdAt), "MMM d, yyyy h:mm a")} />
          </CardContent>
        </Card>

        <ApplicationHistory entries={history} />
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ApplicationStatusBadge status={application.status} />

            {!isPendingStatus && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {application.reviewedBy && <p>Reviewed by {application.reviewedBy.fullName}</p>}
                {application.reviewedAt && <p>{format(new Date(application.reviewedAt), "MMM d, yyyy h:mm a")}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="notes" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Internal notes
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {saveState === "saving" && "Saving…"}
                  {saveState === "saved" && "Saved"}
                </span>
              </div>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Visible to admins only — never shown to the applicant."
                rows={6}
              />
              {notesUpdatedAt && (
                <p className="text-[11px] text-muted-foreground">
                  Last updated {format(new Date(notesUpdatedAt), "MMM d, yyyy h:mm a")}
                  {notesUpdatedByName ? ` by ${notesUpdatedByName}` : ""}
                </p>
              )}
            </div>

            {isPendingStatus && (
              <div className="flex gap-2">
                <Button onClick={() => setApproveOpen(true)} disabled={isPending} className="flex-1">
                  <Check className="size-4" />
                  Approve
                </Button>
                <Button onClick={onRejectClick} disabled={isPending} variant="destructive" className="flex-1">
                  <X className="size-4" />
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 pt-6 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Mail className="size-3.5 shrink-0" />
              <span className="min-w-0 break-words">{application.email}</span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0" />
              <span className="min-w-0 break-words">{application.phone}</span>
            </p>
            {application.company && (
              <p className="flex items-center gap-2">
                <Building2 className="size-3.5 shrink-0" />
                <span className="min-w-0 break-words">{application.company}</span>
              </p>
            )}
            {location && (
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5 shrink-0" />
                <span className="min-w-0 break-words">{location}</span>
              </p>
            )}
            {application.instagram && (
              <p className="flex items-center gap-2">
                <Camera className="size-3.5 shrink-0" />
                <span className="min-w-0 break-words">{application.instagram}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Application?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a CreatorHub360 member account, generate a Member ID, create a QR code, provision
              authentication, and send the welcome email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={onApprove} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Approve
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application?</AlertDialogTitle>
            <AlertDialogDescription>
              {application.fullName} will be notified by email. Your internal notes are saved and never shared with
              the applicant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirmReject} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Reject
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
