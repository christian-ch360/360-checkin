import { redirect } from "next/navigation";
import Link from "next/link";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { listLibraryCategories, getPrimaryOrganizationId } from "@/features/creator-library/services/creator-library.service";
import { LIBRARY_PRIMARY_CATEGORIES } from "@/features/creator-library/lib/category-taxonomy";
import { CONTENT_CATEGORY_LABELS } from "@/features/members/constants/content-categories";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories · Creator Library" };

export default async function AdminLibraryCategoriesPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const organizationId = (await getPrimaryOrganizationId()) ?? actor.organizationId;
  const counts = await listLibraryCategories(organizationId);
  const countByCategory = new Map(counts.map((c) => [c.category, c.count]));
  const primary = new Set(LIBRARY_PRIMARY_CATEGORIES);

  const allCategories = Object.entries(CONTENT_CATEGORY_LABELS)
    .map(([value, label]) => ({ value, label, count: countByCategory.get(value as never) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader
        title="Categories"
        description="The CreatorHub360 category taxonomy and how many published creators use each one."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {allCategories.map((c) => (
          <Link
            key={c.value}
            href={`/creator-library?category=${c.value}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex items-center gap-1.5">
              {c.label}
              {primary.has(c.value as never) ? (
                <span className="rounded bg-[color-mix(in_oklch,var(--community),transparent_88%)] px-1 text-[0.55rem] font-medium uppercase tracking-wide text-[var(--community)]">
                  Primary
                </span>
              ) : null}
            </span>
            <span className={cn("tabular-nums", c.count === 0 && "text-muted-foreground")}>{c.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
