import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
  TEMPLATE_CATEGORY,
  TEMPLATE_DESCRIPTIONS,
  EMAIL_CATEGORY_LABELS,
} from "@/features/communications/config/template-catalog";
import { EmailTemplateRowActions } from "@/features/communications/components/email-template-row-actions";
import type { TemplateName } from "@/lib/email/email-types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Email Templates" };

const TEMPLATE_NAMES = Object.keys(TEMPLATE_CATEGORY) as TemplateName[];

function humanize(name: string) {
  return name
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function EmailTemplatesPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }
  const canManage = hasPermission(actor.systemRole, "communications.manage");

  const rows = [...TEMPLATE_NAMES].sort((a, b) => humanize(a).localeCompare(humanize(b)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description={`${rows.length} templates across every category. Preview or send a test email — full template editing is coming soon.`}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((template) => (
                  <TableRow key={template}>
                    <TableCell className="font-medium">{humanize(template)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{EMAIL_CATEGORY_LABELS[TEMPLATE_CATEGORY[template]]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs text-sm text-muted-foreground">
                      {TEMPLATE_DESCRIPTIONS[template]}
                    </TableCell>
                    <TableCell>
                      <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" variant="outline">
                        Active
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <EmailTemplateRowActions template={template} canManage={canManage} />
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
