import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ShieldCheck, Copy } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { findDuplicateEmailGroups } from "@/features/admin/services/duplicate-emails.service";
import { listUnresolvedDuplicateGroups } from "@/features/admin/services/duplicate-resolution.service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { MemberStatusBadge } from "@/features/members/components/member-status-badge";
import { DuplicateGroupCard } from "@/features/admin/components/duplicate-group-card";

export const dynamic = "force-dynamic";

export const metadata = { title: "Duplicate Emails" };

/**
 * A temporary, admin-only resolution workflow for the historical
 * duplicate-email applications that predate email uniqueness being
 * enforced (see email-lookup.service.ts) — never deletes or auto-merges
 * anything; every resolution is an explicit admin click
 * (resolveDuplicateGroupAction). Once every group below is resolved, this
 * page (and its nav entry) has no ongoing purpose and should be removed —
 * the empty state below says so explicitly.
 */
export default async function DuplicateEmailsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) redirect("/dashboard");

  const [unresolvedGroups, { applicationMemberConflicts }] = await Promise.all([
    listUnresolvedDuplicateGroups(actor.organizationId),
    findDuplicateEmailGroups(actor.organizationId),
  ]);
  const totalIssues = unresolvedGroups.length + applicationMemberConflicts.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Duplicate Emails"
        description="Historical applications from before email uniqueness was enforced. Resolve each group below — nothing here is deleted or merged automatically."
      />

      {totalIssues === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={ShieldCheck}
              title="No duplicate emails need attention"
              description="Every duplicate-email group has been resolved. This page and its nav entry can now be removed — email uniqueness is enforced for every new application and member going forward."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {unresolvedGroups.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Copy className="size-4 text-muted-foreground" />
                Duplicate applications needing resolution
                <Badge variant="secondary">{unresolvedGroups.length}</Badge>
              </h2>
              <div className="space-y-3">
                {unresolvedGroups.map((group) => (
                  <DuplicateGroupCard key={group.email} group={group} />
                ))}
              </div>
            </div>
          )}

          {applicationMemberConflicts.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
                <Copy className="size-4 text-muted-foreground" />
                Applications matching an existing member
                <Badge variant="secondary">{applicationMemberConflicts.length}</Badge>
              </h2>
              <div className="space-y-3">
                {applicationMemberConflicts.map((conflict) => (
                  <Card key={conflict.application.id}>
                    <CardHeader>
                      <CardTitle className="text-base font-medium">{conflict.email}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <Link href={`/admin/applications/${conflict.application.id}`} className="font-medium hover:underline">
                            {conflict.application.fullName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Application · {format(conflict.application.createdAt, "MMM d, yyyy")}
                          </p>
                        </div>
                        <ApplicationStatusBadge status={conflict.application.status} />
                      </div>
                      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <Link href={`/members/${conflict.member.id}`} className="font-medium hover:underline">
                            {conflict.member.fullName}
                          </Link>
                          <p className="text-xs text-muted-foreground">Member</p>
                        </div>
                        <MemberStatusBadge status={conflict.member.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
