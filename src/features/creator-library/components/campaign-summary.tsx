import { formatCompactNumber } from "@/lib/utils/format";

export type CampaignSummaryData = {
  campaignName: string;
  goalLabels: string[];
  categoryLabels: string[];
  platformLabels: string[];
  creatorCount: number | null;
  totalBudget: number | null;
};

function formatMoney(value: number | null): string {
  if (value == null) return "Not set";
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * "Beautiful campaign summary" (spec §6 Step 6, and reused as-is on the
 * campaign detail page) — a single presentational card, no data fetching.
 */
export function CampaignSummary({ data }: { data: CampaignSummaryData }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#EAE1CB] bg-white">
      <div className="border-b border-[#EAE1CB] bg-[#F5F1E8] px-6 py-5">
        <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#B8935A] uppercase">Campaign</p>
        <h3 className="mt-1 text-xl font-semibold text-[#161616]">{data.campaignName || "Untitled campaign"}</h3>
      </div>

      <div className="grid gap-6 px-6 py-5 sm:grid-cols-2">
        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#B8935A] uppercase">Goals</p>
          {data.goalLabels.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-[#161616]">
              {data.goalLabels.map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[#6B6B6B]">Not specified</p>
          )}
        </div>

        <div>
          <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#B8935A] uppercase">Creators</p>
          {data.categoryLabels.length > 0 ? (
            <ul className="mt-2 space-y-1 text-sm text-[#161616]">
              {data.categoryLabels.map((category) => (
                <li key={category}>{category}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-[#6B6B6B]">Any category</p>
          )}
          <p className="mt-3 text-sm text-[#161616]">
            {data.platformLabels.length > 0 ? data.platformLabels.join(" + ") : "Any platform"}
          </p>
          <p className="mt-1 text-sm text-[#161616]">
            {data.creatorCount != null ? `${formatCompactNumber(data.creatorCount)} Creator${data.creatorCount === 1 ? "" : "s"}` : "Creator count not set"}
          </p>
        </div>
      </div>

      <div className="border-t border-[#EAE1CB] px-6 py-5">
        <p className="text-[0.7rem] font-medium tracking-[0.24em] text-[#B8935A] uppercase">Budget</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-[#161616]">{formatMoney(data.totalBudget)}</p>
      </div>
    </div>
  );
}
