import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendingUp } from "lucide-react";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { listLibraryReachTiers, getPrimaryOrganizationId } from "@/features/creator-library/services/creator-library.service";
import { LibraryReachView } from "@/features/creator-library/components/library-reach-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Reach · Creator Library" };

export default async function AdminLibraryReachPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const organizationId = (await getPrimaryOrganizationId()) ?? actor.organizationId;
  const tiers = await listLibraryReachTiers(organizationId);
  const total = tiers.reduce((sum, tier) => sum + tier.count, 0);

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader
        title="Reach"
        description="How published creators distribute across audience tiers, from Emerging to Elite."
      />
      {total === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No reach data yet"
          description="Publish creators with follower counts to see them tiered here."
        />
      ) : (
        <div className="-mt-6">
          <LibraryReachView tiers={tiers} />
        </div>
      )}
    </div>
  );
}
