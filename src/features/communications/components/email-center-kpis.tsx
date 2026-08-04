import { Mail, CalendarClock, CheckCircle2, Clock, XCircle, TrendingUp, Eye, MousePointerClick } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import type { EmailLogKPIs } from "@/features/communications/services/email-logs.service";

export function EmailCenterKpis({ kpis }: { kpis: EmailLogKPIs }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="Total Emails Sent" value={kpis.totalSent.toLocaleString()} icon={Mail} trend={kpis.trend.totalSent} />
      <StatCard label="Sent Today" value={kpis.sentToday.toLocaleString()} icon={CalendarClock} />
      <StatCard label="Delivered" value={kpis.delivered.toLocaleString()} icon={CheckCircle2} accent="success" />
      <StatCard label="Pending" value={kpis.pending.toLocaleString()} icon={Clock} accent="warning" />
      <StatCard label="Failed" value={kpis.failed.toLocaleString()} icon={XCircle} accent="danger" />
      <StatCard
        label="Delivery Rate"
        value={`${kpis.deliveryRate.toFixed(1)}%`}
        icon={TrendingUp}
        accent="primary"
        trend={kpis.trend.deliveryRate}
      />
      <StatCard label="Open Rate" value={`${kpis.openRate.toFixed(1)}%`} icon={Eye} caption="Webhook integration pending" />
      <StatCard
        label="Click Rate"
        value={`${kpis.clickRate.toFixed(1)}%`}
        icon={MousePointerClick}
        caption="Webhook integration pending"
      />
    </div>
  );
}
