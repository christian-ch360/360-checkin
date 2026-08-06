import Link from "next/link";
import { Calendar, Users } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectStatusBadge } from "@/features/projects/components/project-status-badge";
import { formatCompactCurrency } from "@/lib/utils/format";
import type { ProjectStatus } from "@prisma/client";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function ProjectCard({
  project,
}: {
  project: {
    id: string;
    projectCode: string;
    name: string;
    status: ProjectStatus;
    deadline: Date | null;
    gmv: string;
    brand: { name: string } | null;
    projectLeader: { fullName: string; profilePhotoUrl: string | null } | null;
    memberCount: number;
  };
}) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full border shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{project.name}</p>
              <p className="text-xs text-muted-foreground">{project.projectCode}</p>
            </div>
            <ProjectStatusBadge status={project.status} />
          </div>

          {project.brand && <p className="text-xs text-muted-foreground">{project.brand.name}</p>}

          <div className="mt-auto flex items-center justify-between pt-2 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-3.5" /> {project.memberCount}
            </div>
            {project.deadline && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="size-3.5" /> {format(project.deadline, "MMM d")}
              </div>
            )}
            <span className="font-semibold">{formatCompactCurrency(Number(project.gmv))}</span>
          </div>

          {project.projectLeader && (
            <div className="flex items-center gap-2 border-t pt-2">
              <Avatar className="size-5">
                {project.projectLeader.profilePhotoUrl && (
                  <AvatarImage src={project.projectLeader.profilePhotoUrl} />
                )}
                <AvatarFallback className="text-[9px]">{initials(project.projectLeader.fullName)}</AvatarFallback>
              </Avatar>
              <span className="truncate text-xs text-muted-foreground">{project.projectLeader.fullName}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
