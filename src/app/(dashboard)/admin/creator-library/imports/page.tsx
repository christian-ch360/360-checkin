import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { FileClock } from "lucide-react";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { listImportBatches } from "@/features/creator-library/services/creator-library-import.service";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import History · Creator Library" };

export default async function CreatorImportHistoryPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const batches = await listImportBatches(actor.organizationId);

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <PageHeader title="Import History" description="Every CSV import into the Creator Library." />

      {batches.length === 0 ? (
        <EmptyState icon={FileClock} title="No imports yet" description="Imports will appear here once you upload a file." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">File</th>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">By</th>
                <th className="px-4 py-2.5 font-medium">Rows</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
                <th className="px-4 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5 font-medium">Skipped</th>
                <th className="px-4 py-2.5 font-medium">Errors</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{b.fileName}</span>
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[0.6rem] uppercase text-muted-foreground">
                      {b.importMode === "PUBLISH" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{format(b.createdAt, "MMM d, yyyy p")}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{b.uploadedByName ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">{b.totalRows}</td>
                  <td className="px-4 py-3 tabular-nums">{b.createdCount}</td>
                  <td className="px-4 py-3 tabular-nums">{b.updatedCount}</td>
                  <td className="px-4 py-3 tabular-nums">{b.skippedCount}</td>
                  <td className={`px-4 py-3 tabular-nums ${b.errorCount ? "text-destructive" : ""}`}>{b.errorCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/creator-library/imports/${b.id}`} className="text-xs font-medium text-[var(--community)] hover:underline">
                      Report →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
