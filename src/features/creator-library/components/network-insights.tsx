import { MapPin, TrendingUp, Users } from "lucide-react";
import { formatCompactNumber } from "@/lib/utils/format";

/**
 * Three real, honest metrics. No invented growth percentages — when we
 * don't track network growth over time, the status metric says so plainly
 * ("Active Network") rather than fabricating a trend.
 */
export function NetworkInsights({
  totalCreators,
  topLocationLabel,
}: {
  totalCreators: number;
  topLocationLabel: string | null;
}) {
  const metrics = [
    {
      icon: Users,
      value: formatCompactNumber(totalCreators),
      label: "Creators represented",
    },
    {
      icon: MapPin,
      value: topLocationLabel ?? "—",
      label: "Current footprint",
    },
    {
      icon: TrendingUp,
      value: "Active Network",
      label: "Network status",
    },
  ];

  return (
    <div className="rounded-3xl border border-[#EAE1CB] bg-white p-6">
      <h3 className="text-sm font-semibold text-[#161616]">Network Insights</h3>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <metric.icon className="size-4 text-[#B8935A]" />
            <p className="mt-2 text-lg font-semibold leading-tight text-[#161616]">{metric.value}</p>
            <p className="mt-0.5 text-xs text-[#6B6B6B]">{metric.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
