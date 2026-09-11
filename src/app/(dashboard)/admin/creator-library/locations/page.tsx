import { redirect } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { MapPin } from "lucide-react";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { listLibraryLocations, getPrimaryOrganizationId } from "@/features/creator-library/services/creator-library.service";
import { LibraryLocationsView } from "@/features/creator-library/components/library-locations-view";

export const dynamic = "force-dynamic";

export const metadata = { title: "Locations · Creator Library" };

export default async function AdminLibraryLocationsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const organizationId = (await getPrimaryOrganizationId()) ?? actor.organizationId;
  const tree = await listLibraryLocations(organizationId);

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader title="Locations" description="Geographic distribution of published creators. Bulk-assign locations from Browse Creators." />
      {tree.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations yet" description="Add Country / State / City on import or in the profile editor." />
      ) : (
        <div className="-mt-6">
          <LibraryLocationsView tree={tree} />
        </div>
      )}
    </div>
  );
}
