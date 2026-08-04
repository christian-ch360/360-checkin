import Link from "next/link";
import { Users2, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AgencyTeamMember } from "@/features/agencies/services/agency-access.service";

const ROLE_LABELS: Record<string, string> = { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff" };

/** "User is added as a member of the existing agency" — everyone who has been granted access,
 * including the canonical/original agency account itself (always shown first, as Owner). */
export function AgencyTeamCard({ team }: { team: AgencyTeamMember[] }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users2 className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Team</CardTitle>
        </div>
        <Link href="/agency/team" className="text-xs font-medium text-primary hover:underline">
          Manage
        </Link>
      </CardHeader>
      <CardContent className="space-y-2">
        {team.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-medium">{member.fullName}</span>
                {member.isCanonical && <Crown className="size-3.5 shrink-0 text-amber-500" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">{member.email}</p>
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              {ROLE_LABELS[member.role] ?? member.role}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
