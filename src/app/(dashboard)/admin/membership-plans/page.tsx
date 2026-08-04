import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import {
  listPlans,
  listPendingPricingSchedules,
} from "@/features/membership-plans/services/membership-plans.service";
import { listFeatures, getPlanFeatureValues } from "@/features/membership-plans/services/membership-features.service";
import { getMembershipAnalytics, getPlanAnalytics } from "@/features/membership-plans/services/membership-analytics.service";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlansTable } from "@/features/membership-plans/components/plans-table";
import { PlanFormDialog } from "@/features/membership-plans/components/plan-form-dialog";
import { FeatureCatalogManager } from "@/features/membership-plans/components/feature-catalog-manager";
import { FeatureFormDialog } from "@/features/membership-plans/components/feature-form-dialog";
import { MembershipAnalyticsPanel } from "@/features/membership-plans/components/membership-analytics-panel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Membership Plans" };

export default async function MembershipPlansPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "billing.manage")) redirect("/dashboard");
  const canManageFeatureCatalog = hasPermission(actor.systemRole, "billing.override");

  const [plans, features, pendingSchedules, analytics] = await Promise.all([
    listPlans(actor.organizationId),
    listFeatures(actor.organizationId),
    listPendingPricingSchedules(actor.organizationId),
    getMembershipAnalytics(actor.organizationId),
  ]);

  const [plansFeatureValues, plansAnalytics] = await Promise.all([
    Promise.all(plans.map((p) => getPlanFeatureValues(p.id))),
    Promise.all(plans.map((p) => getPlanAnalytics(actor.organizationId, p.id))),
  ]);

  const activeFeatures = features.filter((f) => f.isActive);

  const plansForTable = plans.map((p, i) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    priceCents: p.priceCents,
    trialMonths: p.trialMonths,
    benefits: p.benefits,
    isActive: p.isActive,
    _count: p._count,
    featureValues: plansFeatureValues[i].map((v) => ({
      featureId: v.featureId,
      boolValue: v.boolValue,
      numberValue: v.numberValue,
      textValue: v.textValue,
      isUnlimited: v.isUnlimited,
      displayOverride: v.displayOverride,
    })),
    pendingSchedules: pendingSchedules
      .filter((s) => s.planId === p.id)
      .map((s) => ({ id: s.id, newPriceCents: s.newPriceCents, effectiveAt: s.effectiveAt })),
    analytics: plansAnalytics[i],
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Membership Plans"
        description="Configure packages, benefits, and pricing without deploying new code."
      />

      <Tabs defaultValue="packages">
        <TabsList>
          <TabsTrigger value="packages">Packages</TabsTrigger>
          {canManageFeatureCatalog && <TabsTrigger value="features">Feature Catalog</TabsTrigger>}
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-end">
            <PlanFormDialog />
          </div>
          <PlansTable plans={plansForTable} features={activeFeatures} />
        </TabsContent>

        {canManageFeatureCatalog && (
          <TabsContent value="features" className="space-y-4">
            <div className="flex justify-end">
              <FeatureFormDialog />
            </div>
            <FeatureCatalogManager features={features} />
          </TabsContent>
        )}

        <TabsContent value="analytics">
          <MembershipAnalyticsPanel analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
