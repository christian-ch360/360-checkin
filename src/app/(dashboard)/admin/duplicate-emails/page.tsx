import Link from "next/link";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { ShieldCheck, Copy } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { findDuplicateEmailGroups } from "@/features/admin/services/duplicate-emails.service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApplicationStatusBadge } from "@/features/applications/components/application-status-badge";
import { MemberStatusBadge } from "@/features/members/components/member-status-badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Duplicate Emails" };

/**
 * Read-only review queue for pre-existing "one email, two accounts" data —
 * see findDuplicateEmailGroups's doc comment for exactly what counts. This
 * page never deletes or merges anything; it exists so an admin can look at
 * each case and decide by hand (e.g. reject the stale application, or reach
 * out to the applicant), per the explicit "do not silently merge records"
 * requirement.
 */
export default async function DuplicateEmailsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) redirect("/dashboard");

  const { applicationDuplicateGroups, applicationMemberConflicts } = await findDuplicateEmailGroups(actor.organizationId);
  const totalIssues = applicationDuplicateGroups.length + applicationMemberConflicts.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Duplicate Emails"
        description="Records from before email uniqueness was enforced. Review and resolve each case manually — nothing here is deleted or merged automatically."
      />

      {totalIssues === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={ShieldCheck}
              title="No duplicate emails found"
              description="Every application and member email in this organization is unique."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Copy className="size-4 text-muted-foreground" />
              Duplicate applications
              <Badge variant="secondary">{applicationDuplicateGroups.length}</Badge>
            </h2>
            {applicationDuplicateGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No email was used on more than one application.</p>
            ) : (
              <div className="space-y-3">
                {applicationDuplicateGroups.map((group) => (
                  <Card key={group.email}>
                    <CardHeader>
                      <CardTitle className="text-base font-medium">{group.email}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {group.applications.map((application) => (
                        <div
                          key={application.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <Link href={`/admin/applications/${application.id}`} className="font-medium hover:underline">
                              {application.fullName}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Submitted {format(application.createdAt, "MMM d, yyyy h:mm a")}
                            </p>
                          </div>
                          <ApplicationStatusBadge status={application.status} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
              <Copy className="size-4 text-muted-foreground" />
              Applications matching an existing member
              <Badge variant="secondary">{applicationMemberConflicts.length}</Badge>
            </h2>
            {applicationMemberConflicts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No pending or rejected application shares an email with an existing member.
              </p>
            ) : (
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
                          <p className="text-xs text-muted-foreground">Application</p>
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
            )}
          </div>
        </>
      )}
    </div>
  );
}
