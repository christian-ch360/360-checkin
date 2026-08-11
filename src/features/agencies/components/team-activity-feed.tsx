"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Activity,
  Trophy,
  UserPlus2,
  UserMinus2,
  Mail,
  MailX,
  Shuffle,
  Crown,
  CheckCircle2,
  XCircle,
  DollarSign,
  Loader2,
  Megaphone,
  FileSignature,
  Receipt,
  ListChecks,
} from "lucide-react";
import type { AgencyActivityType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { getAgencyActivityAction } from "@/features/agencies/services/agency-activity-actions";
import type { AgencyActivityEntry, AgencyActivityFilter } from "@/features/agencies/services/agency-activity.service";

const TYPE_ICONS: Record<AgencyActivityType, typeof Activity> = {
  INVITATION_SENT: Mail,
  INVITATION_ACCEPTED: CheckCircle2,
  INVITATION_DECLINED: MailX,
  INVITATION_REVOKED: MailX,
  TEAM_MEMBER_REMOVED: UserMinus2,
  ROLE_CHANGED: Shuffle,
  OWNERSHIP_TRANSFERRED: Crown,
  CREATOR_REQUEST_RECEIVED: UserPlus2,
  CREATOR_APPROVED: CheckCircle2,
  CREATOR_REJECTED: XCircle,
  CREATOR_JOINED: UserPlus2,
  FIRST_GMV: DollarSign,
  GMV_MILESTONE: Trophy,
  PROFILE_UPDATED: Activity,
  CAMPAIGN_CREATED: Megaphone,
  CAMPAIGN_STATUS_CHANGED: Megaphone,
  CONTRACT_SENT: FileSignature,
  CONTRACT_SIGNED: FileSignature,
  INVOICE_PAID: Receipt,
  TASK_ASSIGNED: ListChecks,
};

const FILTERS: { value: AgencyActivityFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "all", label: "All Time" },
];

export function TeamActivityFeed({ initialEntries }: { initialEntries: AgencyActivityEntry[] }) {
  const [filter, setFilter] = useState<AgencyActivityFilter>("all");
  const [entries, setEntries] = useState(initialEntries);
  const [isPending, startTransition] = useTransition();

  function handleFilterChange(value: string) {
    const next = value as AgencyActivityFilter;
    setFilter(next);
    startTransition(async () => {
      const result = await getAgencyActivityAction(next);
      setEntries(result);
    });
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Team Activity</CardTitle>
        </div>
        <Tabs value={filter} onValueChange={handleFilterChange}>
          <TabsList className="h-8">
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value} className="text-xs">
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState icon={Activity} title="No activity yet" description="Team actions like invitations, approvals, and milestones show up here." />
        ) : (
          <div className="space-y-1">
            {entries.map((entry) => {
              const Icon = TYPE_ICONS[entry.type] ?? Activity;
              return (
                <div key={entry.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5 hover:bg-muted/40">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{entry.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(entry.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
