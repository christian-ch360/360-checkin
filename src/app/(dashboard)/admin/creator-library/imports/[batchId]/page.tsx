import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { AdminLibrarySubNav } from "@/features/creator-library/admin/admin-library-subnav";
import { getImportBatch } from "@/features/creator-library/services/creator-library-import.service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Import Report · Creator Library" };

const OUTCOME_TONE: Record<string, string> = {
  created: "text-[var(--success)]",
  updated: "text-sky-600 dark:text-sky-400",
  skipped: "text-muted-foreground",
  error: "text-destructive",
};

export default async function CreatorImportReportPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    redirect("/dashboard");
  }

  const { batchId } = await params;
  const batch = await getImportBatch(actor.organizationId, batchId);
  if (!batch) notFound();

  return (
    <div className="space-y-6">
      <AdminLibrarySubNav />
      <Link
        href="/admin/creator-library/imports"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Import History
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{batch.fileName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {format(batch.createdAt, "MMM d, yyyy p")} · {batch.uploadedByName ?? "—"} ·{" "}
          {batch.importMode === "PUBLISH" ? "Published" : "Draft"} · Existing:{" "}
          {batch.existingMode === "FILL_MISSING" ? "fill missing" : batch.existingMode === "UPDATE_SELECTED" ? "update selected" : "skip"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Rows", batch.totalRows],
          ["Created", batch.createdCount],
          ["Updated", batch.updatedCount],
          ["Skipped", batch.skippedCount],
          ["Errors", batch.errorCount],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <p className="text-xl font-semibold tabular-nums">{value}</p>
            <p className="text-[0.7rem] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">#</th>
              <th className="px-4 py-2.5 font-medium">Creator</th>
              <th className="px-4 py-2.5 font-medium">Outcome</th>
              <th className="px-4 py-2.5 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {batch.report.map((entry) => (
              <tr key={entry.rowNumber} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2 text-xs text-muted-foreground">{entry.rowNumber}</td>
                <td className="px-4 py-2">{entry.name ?? "—"}</td>
                <td className={cn("px-4 py-2 font-medium capitalize", OUTCOME_TONE[entry.outcome])}>{entry.outcome}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{entry.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
