import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { listInvitations } from "@/features/admin/services/invitations.service";
import { getAdminKpis } from "@/features/dashboard/services/admin-kpis.service";
import { getPlatformIntegrationsCatalog } from "@/features/integrations/services/social-connections.service";
import { InviteMemberForm } from "@/features/admin/components/invite-member-form";
import { InvitationsList } from "@/features/admin/components/invitations-list";
import { BulkImportPanel } from "@/features/admin/components/bulk-import-panel";
import { PermissionsTable } from "@/features/admin/components/permissions-table";
import { AdminKpiGrid } from "@/features/dashboard/components/admin-kpi-grid";
import { IntegrationsPanel } from "@/features/integrations/components/integrations-panel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { isDemoModeActive, demoGetAdminKpis } from "@/features/demo-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }
  const canManageRoles = hasPermission(actor.systemRole, "roles.manage");

  const [invitations, members, organization, kpis, integrations] = await Promise.all([
    listInvitations(actor.organizationId),
    prisma.member.findMany({
      where: { organizationId: actor.organizationId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true, systemRole: true },
    }),
    prisma.organization.findUnique({ where: { id: actor.organizationId } }),
    isDemoModeActive(actor) ? Promise.resolve(demoGetAdminKpis()) : getAdminKpis(actor.organizationId),
    getPlatformIntegrationsCatalog(actor.organizationId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage invitations, permissions, and organization data.</p>
      </div>

      <AdminKpiGrid kpis={kpis} />

      <Tabs defaultValue="invitations">
        <TabsList>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
          <TabsTrigger value="import">Bulk import / export</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="integrations">Platform Integrations</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite a member</CardTitle>
              <CardDescription>
                Creates a pending invitation. Connect an email provider to deliver invite emails automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InviteMemberForm canManageRoles={canManageRoles} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending &amp; recent invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <InvitationsList
                invitations={invitations.map((i) => ({
                  id: i.id,
                  email: i.email,
                  role: i.role,
                  // Lazily computed — this app has no background job to flip
                  // PENDING rows to EXPIRED once expiresAt passes, so the
                  // admin list reflects real expiry the same way
                  // getValidInvitation does at signup time.
                  status: i.status === "PENDING" && i.expiresAt < new Date() ? "EXPIRED" : i.status,
                  expiresAt: i.expiresAt,
                  createdAt: i.createdAt,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <BulkImportPanel />
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Bulk export</CardTitle>
              <CardDescription>Export all members as a spreadsheet.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <a href="/api/reports/members?format=xlsx" download>
                  <FileDown /> Export members (Excel)
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Member permissions</CardTitle>
              <CardDescription>Only Super Admins can change system roles.</CardDescription>
            </CardHeader>
            <CardContent>
              <PermissionsTable members={members} canEdit={canManageRoles} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsPanel integrations={integrations} />
        </TabsContent>

        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Name:</span> {organization?.name}
              </p>
              <p>
                <span className="text-muted-foreground">Slug:</span> {organization?.slug}
              </p>
              <p>
                <span className="text-muted-foreground">Members:</span> {members.length}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
