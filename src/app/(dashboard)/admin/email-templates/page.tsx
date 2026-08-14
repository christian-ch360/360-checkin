import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { EMAIL_CATEGORY_LABELS } from "@/features/communications/config/template-catalog";
import { EmailTemplateRowActions } from "@/features/communications/components/email-template-row-actions";
import { listEmailTemplateRows, humanizeTemplateKey } from "@/features/communications/services/email-template-admin.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Email Templates" };

// Descriptions past this length are the ones that actually clip at the
// column's rendered width — only those get a tooltip, so short descriptions
// (most of them) don't show a pointless hover affordance.
const DESCRIPTION_TRUNCATE_THRESHOLD = 60;

function TemplateDescriptionCell({ description }: { description: string | null }) {
  if (!description) return <span className="text-muted-foreground">—</span>;
  const truncated = <div className="truncate">{description}</div>;
  if (description.length <= DESCRIPTION_TRUNCATE_THRESHOLD) return truncated;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{truncated}</TooltipTrigger>
      <TooltipContent>{description}</TooltipContent>
    </Tooltip>
  );
}

function StatusBadge({ isSystem, overrideStatus }: { isSystem: boolean; overrideStatus: "DRAFT" | "ACTIVE" | "INACTIVE" | null }) {
  // A system template with no saved override is live via its code default —
  // that's "Active" from the sender's perspective even though nothing is
  // stored in email_templates yet.
  if (isSystem && overrideStatus === null) {
    return (
      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" variant="outline">
        Active
      </Badge>
    );
  }
  if (overrideStatus === "ACTIVE") {
    return (
      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" variant="outline">
        Active
      </Badge>
    );
  }
  if (overrideStatus === "DRAFT") {
    return (
      <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400" variant="outline">
        Draft
      </Badge>
    );
  }
  // INACTIVE — for a system row this means "reverted to the code default,"
  // for a custom row it means "turned off."
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {isSystem ? "Default" : "Inactive"}
    </Badge>
  );
}

export default async function EmailTemplatesPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }
  const canManage = hasPermission(actor.systemRole, "communications.manage");

  const rows = (await listEmailTemplateRows(actor.organizationId)).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description={`${rows.length} templates across every category. Preview, edit, or send a test email.`}
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/admin/email-templates/new">
                <Plus className="size-4" /> Create Template
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Template Name</TableHead>
                  <TableHead className="w-40">Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-[220px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.templateKey}>
                    <TableCell className="truncate font-medium">
                      <span className="truncate">{row.name || humanizeTemplateKey(row.templateKey)}</span>
                      {!row.isSystem && <span className="ml-1.5 text-xs font-normal text-muted-foreground">Custom</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{EMAIL_CATEGORY_LABELS[row.category]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <TemplateDescriptionCell description={row.description} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge isSystem={row.isSystem} overrideStatus={row.overrideStatus} />
                    </TableCell>
                    <TableCell>
                      <EmailTemplateRowActions row={row} canManage={canManage} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
