import { format } from "date-fns";
import { CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { statusToneClass } from "@/lib/utils/status-colors";
import type { IntegrationEntry } from "@/features/integrations/config/catalog";

function StatusBadge({ tone, children }: { tone: keyof typeof statusToneClass; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn(statusToneClass[tone])}>
      {children}
    </Badge>
  );
}

function IntegrationRow({
  label,
  status,
  syncStatus,
  accountConnected,
  lastSyncedAt,
}: {
  label: string;
  status: React.ReactNode;
  syncStatus?: React.ReactNode;
  accountConnected: string;
  lastSyncedAt: Date | null;
}) {
  return (
    <div className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{accountConnected}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        {status}
        {syncStatus}
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {lastSyncedAt ? format(lastSyncedAt, "MMM d, h:mm a") : "Never synced"}
        </span>
      </div>
    </div>
  );
}

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="px-4 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{children}</h3>;
}

export function IntegrationsPanel({ integrations }: { integrations: IntegrationEntry[] }) {
  const memberOAuth = integrations.filter((i) => i.kind === "member-oauth");
  const storeOAuth = integrations.filter((i) => i.kind === "store-oauth");
  const authProviders = integrations.filter((i) => i.kind === "auth-provider");
  const services = integrations.filter((i) => i.kind === "service");
  const comingSoon = integrations.filter((i) => i.kind === "coming-soon");

  return (
    <Card className="p-0">
      <CardContent className="divide-y p-0">
        <div>
          <GroupHeading>Social platforms</GroupHeading>
          {memberOAuth.map((i) => (
            <IntegrationRow
              key={i.platform}
              label={i.label}
              status={
                !i.configured ? (
                  <StatusBadge tone="neutral">Not configured</StatusBadge>
                ) : i.connectedCount > 0 ? (
                  <StatusBadge tone="success">Connected</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Not connected</StatusBadge>
                )
              }
              accountConnected={`${i.connectedCount} of ${i.totalMembers} creators connected`}
              lastSyncedAt={i.lastSyncedAt}
            />
          ))}
        </div>

        <div>
          <GroupHeading>Online store</GroupHeading>
          {storeOAuth.map((i) => (
            <IntegrationRow
              key={i.provider}
              label={i.label}
              status={
                !i.configured ? (
                  <StatusBadge tone="neutral">Not configured</StatusBadge>
                ) : i.connectedCount > 0 ? (
                  <StatusBadge tone="success">Connected</StatusBadge>
                ) : (
                  <StatusBadge tone="neutral">Not connected</StatusBadge>
                )
              }
              accountConnected={`${i.connectedCount} of ${i.totalMembers} creators connected`}
              lastSyncedAt={i.lastSyncedAt}
            />
          ))}
        </div>

        <div>
          <GroupHeading>Sign-in providers</GroupHeading>
          {authProviders.map((i) => (
            <IntegrationRow
              key={i.key}
              label={i.label}
              status={<StatusBadge tone="success">Enabled</StatusBadge>}
              accountConnected="Managed in your Supabase project — no per-member setup needed"
              lastSyncedAt={null}
            />
          ))}
        </div>

        <div>
          <GroupHeading>Services</GroupHeading>
          {services.map((i) => (
            <IntegrationRow
              key={i.key}
              label={i.label}
              status={
                i.configured ? <StatusBadge tone="success">Connected</StatusBadge> : <StatusBadge tone="neutral">Not configured</StatusBadge>
              }
              accountConnected={i.configured ? `${i.recentActivity} emails sent in the last 30 days` : "Set RESEND_API_KEY to enable"}
              lastSyncedAt={null}
            />
          ))}
        </div>

        <div>
          <GroupHeading>Coming soon</GroupHeading>
          {comingSoon.map((i) => (
            <IntegrationRow
              key={i.key}
              label={i.label}
              status={
                <Badge variant="outline" className="text-muted-foreground">
                  <Sparkles className="size-3" /> Coming soon
                </Badge>
              }
              accountConnected="Not yet available"
              lastSyncedAt={null}
            />
          ))}
        </div>

        <p className="flex items-start gap-2 border-t bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
          Connecting, reconnecting, and disconnecting an account is self-service — each creator manages their own
          connections from their Profile page. Social platforms sync follower counts; connected stores sync revenue
          via GMV/commission fields.
        </p>
      </CardContent>
    </Card>
  );
}
