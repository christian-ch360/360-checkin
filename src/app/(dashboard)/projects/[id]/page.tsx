import { notFound } from "next/navigation";
import { DollarSign, Percent, Wallet, Users, Pencil } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import {
  getProjectDetail,
  listOrgMembers,
  listOrgBrandsAndClients,
} from "@/features/projects/services/projects.service";
import { hasPermission } from "@/lib/permissions";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectStatusBadge } from "@/features/projects/components/project-status-badge";
import { ProjectForm } from "@/features/projects/components/project-form";
import { AssignmentsPanel } from "@/features/projects/components/assignments-panel";
import { ProjectCollaborationPanel } from "@/features/projects/components/project-collaboration-panel";
import { TasksPanel } from "@/features/projects/components/tasks-panel";
import { NotesPanel } from "@/features/projects/components/notes-panel";
import { QRCodeDisplay } from "@/features/qr/components/qr-code-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatCompactCurrency, formatCurrency } from "@/lib/utils/format";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  const detail = await getProjectDetail(actor.organizationId, id);
  if (!detail) notFound();

  const { project, gmvTransactions, commissionTransactions } = detail;
  const canManage = hasPermission(actor.systemRole, "projects.manage");

  const [members, { brands, companies }] = await Promise.all([
    listOrgMembers(actor.organizationId),
    listOrgBrandsAndClients(actor.organizationId),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {project.projectCode}
            {project.brand ? ` · ${project.brand.name}` : ""}
            {project.client ? ` · ${project.client.name}` : ""}
          </p>
        </div>
        {canManage && (
          <ProjectForm
            brands={brands}
            companies={companies}
            members={members}
            project={{
              id: project.id,
              name: project.name,
              description: project.description,
              clientId: project.clientId,
              brandId: project.brandId,
              status: project.status,
              deadline: project.deadline?.toISOString() ?? null,
              projectLeaderId: project.projectLeaderId,
              budget: project.budget.toString(),
            }}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil /> Edit
              </Button>
            }
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="GMV" value={formatCompactCurrency(Number(project.gmv))} icon={DollarSign} accent="success" />
        <StatCard label="Commission pool" value={formatCompactCurrency(Number(project.commissionPool))} icon={Percent} accent="warning" />
        <StatCard label="Budget" value={formatCompactCurrency(Number(project.budget))} icon={Wallet} accent="primary" />
        <StatCard label="Team size" value={String(project.assignments.length)} icon={Users} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="team">
            <TabsList>
              <TabsTrigger value="team">Team</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="gmv">GMV &amp; Commission</TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <AssignmentsPanel
                    projectId={project.id}
                    assignments={project.assignments.map((a) => ({
                      id: a.id,
                      role: a.role,
                      commissionPct: a.commissionPct.toString(),
                      contributionPct: a.contributionPct.toString(),
                      hours: a.hours.toString(),
                      status: a.status,
                      member: a.member,
                    }))}
                    availableMembers={members}
                    canManage={canManage}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <ProjectCollaborationPanel
                    projectId={project.id}
                    canManage={canManage}
                    canRequestToJoin={!project.assignments.some((a) => a.member.id === actor.id)}
                    pendingRequests={project.collaborationRequests.map((r) => ({
                      id: r.id,
                      message: r.message,
                      member: r.member,
                    }))}
                    pendingInvitations={project.invitations.map((i) => ({
                      id: i.id,
                      email: i.email,
                      roleLabel: i.roleLabel,
                      expiresAt: i.expiresAt,
                    }))}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tasks">
              <Card>
                <CardContent className="pt-6">
                  <TasksPanel projectId={project.id} tasks={project.tasks} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="notes">
              <Card>
                <CardContent className="pt-6">
                  <NotesPanel projectId={project.id} notes={project.notes} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="gmv">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Recent GMV entries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {gmvTransactions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No GMV recorded yet.</p>
                  ) : (
                    gmvTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t.member.fullName} · {format(t.transactionDate, "MMM d, yyyy")}
                        </span>
                        <span className="font-medium">{formatCurrency(Number(t.amount))}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Recent commission payouts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {commissionTransactions.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">No commissions generated yet.</p>
                  ) : (
                    commissionTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {t.member.fullName} · Tier {t.tierCode} ({t.percentage.toString()}%)
                        </span>
                        <span className="font-medium">{formatCurrency(Number(t.commissionAmount))}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {project.qrAsset && <QRCodeDisplay token={project.qrAsset.token} label={project.name} />}
          {project.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{project.description}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
