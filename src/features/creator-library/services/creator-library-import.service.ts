import "server-only";

import { prisma } from "@/lib/db/prisma";

export type ImportBatchRow = {
  id: string;
  fileName: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  importMode: "DRAFT" | "PUBLISH";
  existingMode: "SKIP" | "FILL_MISSING" | "UPDATE_SELECTED";
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  uploadedByName: string | null;
  createdAt: Date;
};

export type ImportBatchReportEntry = {
  rowNumber: number;
  name: string | null;
  outcome: "created" | "updated" | "skipped" | "error";
  detail: string;
};

export async function listImportBatches(organizationId: string): Promise<ImportBatchRow[]> {
  const batches = await prisma.creatorImportBatch.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fileName: true,
      status: true,
      importMode: true,
      existingMode: true,
      totalRows: true,
      createdCount: true,
      updatedCount: true,
      skippedCount: true,
      errorCount: true,
      createdAt: true,
      uploadedBy: { select: { fullName: true, displayName: true } },
    },
  });

  return batches.map((b) => ({
    id: b.id,
    fileName: b.fileName,
    status: b.status,
    importMode: b.importMode,
    existingMode: b.existingMode,
    totalRows: b.totalRows,
    createdCount: b.createdCount,
    updatedCount: b.updatedCount,
    skippedCount: b.skippedCount,
    errorCount: b.errorCount,
    uploadedByName: b.uploadedBy?.displayName ?? b.uploadedBy?.fullName ?? null,
    createdAt: b.createdAt,
  }));
}

export async function getImportBatch(organizationId: string, batchId: string) {
  const batch = await prisma.creatorImportBatch.findFirst({
    where: { id: batchId, organizationId },
    select: {
      id: true,
      fileName: true,
      fileSizeBytes: true,
      status: true,
      importMode: true,
      existingMode: true,
      totalRows: true,
      createdCount: true,
      updatedCount: true,
      skippedCount: true,
      errorCount: true,
      mapping: true,
      report: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      uploadedBy: { select: { fullName: true, displayName: true } },
    },
  });
  if (!batch) return null;

  const report = Array.isArray(batch.report) ? (batch.report as unknown as ImportBatchReportEntry[]) : [];
  return {
    ...batch,
    uploadedByName: batch.uploadedBy?.displayName ?? batch.uploadedBy?.fullName ?? null,
    report,
  };
}
