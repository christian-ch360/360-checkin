import { Handshake, Clock, TrendingUp, Award } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";

function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(ms / (1000 * 60))}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export function CollabStatsPanel({
  stats,
}: {
  stats: {
    open: number;
    past: number;
    completed: number;
    acceptedAsApplicant: number;
    responseRate: number | null;
    avgResponseMs: number | null;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <StatCard label="Open collaborations" value={String(stats.open)} icon={Handshake} accent="primary" />
      <StatCard label="Past collaborations" value={String(stats.past)} icon={Handshake} />
      <StatCard label="Completed" value={String(stats.completed)} icon={Handshake} accent="success" />
      <StatCard label="Hired as applicant" value={String(stats.acceptedAsApplicant)} icon={Award} />
      <StatCard
        label="Response rate"
        value={stats.responseRate === null ? "—" : `${Math.round(stats.responseRate * 100)}%`}
        icon={TrendingUp}
      />
      <StatCard label="Avg. response time" value={formatDuration(stats.avgResponseMs)} icon={Clock} />
    </div>
  );
}
