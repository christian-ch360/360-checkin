import Link from "next/link";
import { FolderKanban } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { listProjects, listOrgMembers, listOrgBrandsAndClients } from "@/features/projects/services/projects.service";
import { hasPermission } from "@/lib/permissions";
import { ProjectCard } from "@/features/projects/components/project-card";
import { ProjectForm } from "@/features/projects/components/project-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ExportReportButton } from "@/features/reports/components/export-report-button";
import { cn } from "@/lib/utils";
import { isDemoModeActive, demoListProjects } from "@/features/demo-data";

export const dynamic = "force-dynamic";

export const metadata = { title: "Projects" };

const STATUS_TABS: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PLANNING", label: "Planning" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "History" },
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "projects.manage");
  const params = await searchParams;
  const status = STATUS_TABS.some((t) => t.value === params.status) ? (params.status as ProjectStatus | "all") : "all";

  const [allProjects, members, { brands, companies }] = await Promise.all([
    isDemoModeActive(actor) ? Promise.resolve(demoListProjects({})) : listProjects(actor.organizationId),
    listOrgMembers(actor.organizationId),
    listOrgBrandsAndClients(actor.organizationId),
  ]);

  // Demo mode has no server-side status filter, so it's applied here for
  // both paths instead — one filter, one place, works for either data source.
  const projects = status === "all" ? allProjects : allProjects.filter((p) => p.status === status);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projects"
        description={`${allProjects.length} project${allProjects.length === 1 ? "" : "s"} across your organization.`}
        actions={
          <div className="flex items-center gap-2">
            {hasPermission(actor.systemRole, "reports.export") && (
              <ExportReportButton type="projects" label="Export Projects" />
            )}
            {canManage && <ProjectForm brands={brands} companies={companies} members={members} />}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5 border-b">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/projects" : `/projects?status=${tab.value}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              status === tab.value ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {projects.length === 0 ? (
        <EmptyState icon={FolderKanban} title="No projects yet" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={{
                id: p.id,
                projectCode: p.projectCode,
                name: p.name,
                status: p.status,
                deadline: p.deadline,
                gmv: p.gmv.toString(),
                brand: p.brand,
                projectLeader: p.projectLeader,
                memberCount: p._count.assignments,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
