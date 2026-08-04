import { FolderKanban } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProjectStatusBadge } from "@/features/projects/components/project-status-badge";
import { formatCompactCurrency } from "@/lib/utils/format";

export function ProjectsTab({
  projects,
}: {
  projects: {
    id: string;
    projectCode: string;
    name: string;
    brand: string | null;
    team: string[];
    status: ProjectStatus;
    gmv: number;
  }[];
}) {
  if (projects.length === 0) {
    return <EmptyState icon={FolderKanban} title="No projects yet" description="Projects you're assigned to will show up here." />;
  }

  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <Card key={p.id}>
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <ProjectStatusBadge status={p.status} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {p.projectCode}
                {p.brand ? ` · ${p.brand}` : ""}
                {p.team.length > 0 ? ` · ${p.team.length} on team` : ""}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tracking-tight">{formatCompactCurrency(p.gmv)}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
