import Link from "next/link";
import { Users, UserCheck, Clock, Sparkles, Building2, Share2, Radio, DollarSign, TrendingUp, Percent } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { formatCompactCurrency } from "@/lib/utils/format";

type AdminKpis = {
  members: { totalCreators: number; totalMembers: number; activeMemberships: number; pendingApplications: number };
  brands: { totalBrands: number };
  social: { totalFollowers: number; combinedSocialReach: number };
  revenue: { membershipRevenueCents: number; totalGMV: number; totalCommissions: number };
};

function KpiGroup({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </div>
  );
}

export function AdminKpiGrid({ kpis }: { kpis: AdminKpis }) {
  return (
    <div className="space-y-6">
      <KpiGroup
        title="Members"
        action={
          <Link href="/members/pending" className="text-xs font-medium text-primary hover:underline">
            Review pending applications →
          </Link>
        }
      >
        <StatCard label="Total creators" value={String(kpis.members.totalCreators)} icon={Sparkles} />
        <StatCard label="Total members" value={String(kpis.members.totalMembers)} icon={Users} />
        <StatCard label="Active memberships" value={String(kpis.members.activeMemberships)} icon={UserCheck} accent="success" />
        <StatCard
          label="Pending applications"
          value={String(kpis.members.pendingApplications)}
          icon={Clock}
          accent={kpis.members.pendingApplications > 0 ? "warning" : "default"}
        />
      </KpiGroup>

      <KpiGroup title="Brands">
        <StatCard label="Total brands" value={String(kpis.brands.totalBrands)} icon={Building2} />
      </KpiGroup>

      <KpiGroup title="Social">
        <StatCard label="Total followers" value={kpis.social.totalFollowers.toLocaleString()} icon={Share2} />
        <StatCard label="Combined social reach" value={kpis.social.combinedSocialReach.toLocaleString()} icon={Radio} />
      </KpiGroup>

      <KpiGroup title="Revenue">
        <StatCard
          label="Membership revenue"
          value={formatCompactCurrency(kpis.revenue.membershipRevenueCents / 100)}
          icon={DollarSign}
          accent="success"
        />
        <StatCard label="Total GMV" value={formatCompactCurrency(kpis.revenue.totalGMV)} icon={TrendingUp} accent="success" />
        <StatCard label="Total commissions" value={formatCompactCurrency(kpis.revenue.totalCommissions)} icon={Percent} />
      </KpiGroup>
    </div>
  );
}
