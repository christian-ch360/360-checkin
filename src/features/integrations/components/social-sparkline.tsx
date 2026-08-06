"use client";

import { Line, LineChart } from "recharts";
import type { SparklinePoint } from "@/features/integrations/services/follower-growth.service";

export function SocialSparkline({ points, positive }: { points: SparklinePoint[]; positive: boolean }) {
  const data = points.map((p) => ({ value: p.followers }));
  return (
    <LineChart width={84} height={32} data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
      <Line
        type="monotone"
        dataKey="value"
        stroke={positive ? "#10b981" : "var(--destructive)"}
        strokeWidth={1.5}
        dot={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
