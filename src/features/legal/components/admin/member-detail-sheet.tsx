"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, ShieldAlert } from "lucide-react";
import type { LegalDocumentType } from "@prisma/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { statusToneClass } from "@/lib/utils/status-colors";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { COMPLIANCE_STATUS_META } from "@/features/legal/config/compliance-status-meta";
import {
  fetchMemberComplianceDetailAction,
  forceReacceptanceAction,
} from "@/features/legal/services/legal-actions";
import type { MemberComplianceDetail } from "@/features/legal/services/compliance.service";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm">{value}</p>
    </div>
  );
}

export function MemberDetailSheet({
  memberId,
  open,
  onOpenChange,
  canForceReaccept,
}: {
  memberId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canForceReaccept: boolean;
}) {
  const [detail, setDetail] = useState<MemberComplianceDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [forceTarget, setForceTarget] = useState<LegalDocumentType | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !memberId) {
      setDetail(null);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    fetchMemberComplianceDetailAction(memberId)
      .then(setDetail)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load member."))
      .finally(() => setLoading(false));
  }, [memberId, open]);

  function handleForceReaccept() {
    if (!memberId) return;
    startTransition(async () => {
      const result = await forceReacceptanceAction(memberId, forceTarget ?? undefined);
      setForceTarget(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Re-acceptance forced");
      fetchMemberComplianceDetailAction(memberId).then(setDetail).catch(() => {});
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Compliance detail</SheetTitle>
          <SheetDescription className="sr-only">
            Full legal acceptance history for this member.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          {loadError && <p className="text-sm text-destructive">{loadError}</p>}

          {detail && (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{detail.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">{detail.email}</p>
                </div>
                <Badge variant="outline" className={statusToneClass[COMPLIANCE_STATUS_META[detail.status].tone]}>
                  {COMPLIANCE_STATUS_META[detail.status].label}
                </Badge>
              </div>

              <section className="grid grid-cols-2 gap-3">
                <Field label="Role" value={ROLE_LABELS[detail.role]} />
                <Field label="Member Status" value={detail.memberStatus} />
              </section>

              <Separator />

              <section className="space-y-4">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Documents
                </h3>
                {detail.documents.map((doc) => (
                  <div key={doc.documentType} className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{doc.title}</p>
                      {doc.reacceptanceRequired ? (
                        <Badge variant="outline" className={statusToneClass.warning}>
                          Re-acceptance required
                        </Badge>
                      ) : (
                        <Badge variant="outline" className={statusToneClass.success}>
                          Up to date
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Required version {doc.requiredVersion} · Current version {doc.currentVersion}
                    </p>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">
                          Original application acceptance
                        </p>
                        {doc.original ? (
                          <>
                            <p className="text-xs">
                              v{doc.original.version} · {format(doc.original.acceptedAt, "MMM d, yyyy h:mm a")}
                            </p>
                            {doc.original.ipAddress !== null && (
                              <p className="text-[11px] text-muted-foreground">IP {doc.original.ipAddress ?? "—"}</p>
                            )}
                            {doc.original.userAgent !== null && (
                              <p className="truncate text-[11px] text-muted-foreground" title={doc.original.userAgent ?? undefined}>
                                {doc.original.userAgent}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase">
                          Current member acceptance
                        </p>
                        {doc.current ? (
                          <>
                            <p className="text-xs">
                              v{doc.current.version} · {format(doc.current.acceptedAt, "MMM d, yyyy h:mm a")}
                            </p>
                            {doc.current.ipAddress !== null && (
                              <p className="text-[11px] text-muted-foreground">IP {doc.current.ipAddress ?? "—"}</p>
                            )}
                            {doc.current.userAgent !== null && (
                              <p className="truncate text-[11px] text-muted-foreground" title={doc.current.userAgent ?? undefined}>
                                {doc.current.userAgent}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Never accepted</p>
                        )}
                      </div>
                    </div>

                    {canForceReaccept && doc.current && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive"
                        onClick={() => setForceTarget(doc.documentType)}
                      >
                        <ShieldAlert className="size-3.5" />
                        Force Re-Acceptance
                      </Button>
                    )}
                  </div>
                ))}
              </section>
            </>
          )}
        </div>
      </SheetContent>

      <AlertDialog open={!!forceTarget} onOpenChange={(o) => !o && setForceTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Force re-acceptance?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the member&apos;s recorded acceptance for this document. They will be required to
              re-accept it before continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceReaccept} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Force Re-Acceptance
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
