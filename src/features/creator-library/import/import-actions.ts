"use server";

import { revalidatePath } from "next/cache";
import type { ContentCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { logAudit } from "@/lib/db/audit-log";
import { importPayloadSchema, type ImportPayload, type MappedRow } from "@/features/creator-library/import/import-schema";
import { validateRow, type NormalizedRow } from "@/features/creator-library/import/import-validate";
import {
  buildDedupIndexes,
  classifyRow,
  type DedupMember,
  type DedupProfile,
  type RowClassification,
} from "@/features/creator-library/import/import-dedup";

export type ImportPreviewRow = {
  rowNumber: number;
  name: string | null;
  kind: RowClassification["kind"] | "ERROR" | "BLANK";
  matchedBy: string | null;
  targetProfileId: string | null;
  linkedMemberId: string | null;
  candidates: { profileId?: string; memberId?: string; name: string; reason: string }[];
  errors: string[];
  warnings: string[];
};

export type ImportPreview = {
  summary: {
    totalRows: number;
    valid: number;
    newCount: number;
    updateCount: number;
    duplicateCount: number;
    errorCount: number;
    blankCount: number;
    missingCategories: number;
    missingLocations: number;
    missingSocials: number;
  };
  rows: ImportPreviewRow[];
};

export type ImportPreviewResult = { success: true; preview: ImportPreview } | { success: false; error: string };
export type ImportRunResult =
  | { success: true; batchId: string; created: number; updated: number; skipped: number; errors: number }
  | { success: false; error: string };

async function requireImporter() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "members.manage")) {
    throw new Error("You don't have permission to import creators.");
  }
  return actor;
}

async function loadDedupData(organizationId: string) {
  const [members, profiles] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId, role: "CREATOR", status: "ACTIVE", deletedAt: null },
      select: {
        id: true,
        fullName: true,
        displayName: true,
        email: true,
        instagramUrl: true,
        tiktokUrl: true,
        creatorLibraryProfile: { select: { id: true } },
      },
    }),
    prisma.creatorLibraryProfile.findMany({
      where: { organizationId },
      select: {
        id: true,
        memberId: true,
        name: true,
        email: true,
        instagramUrl: true,
        tiktokUrl: true,
        member: { select: { fullName: true, displayName: true, email: true, instagramUrl: true, tiktokUrl: true } },
      },
    }),
  ]);

  const dedupMembers: DedupMember[] = members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    displayName: m.displayName,
    email: m.email,
    instagramUrl: m.instagramUrl,
    tiktokUrl: m.tiktokUrl,
    hasProfile: Boolean(m.creatorLibraryProfile),
  }));

  const dedupProfiles: DedupProfile[] = profiles.map((p) => ({
    id: p.id,
    memberId: p.memberId,
    name: p.name ?? p.member?.displayName ?? p.member?.fullName ?? null,
    email: p.email ?? p.member?.email ?? null,
    instagramUrl: p.instagramUrl ?? p.member?.instagramUrl ?? null,
    tiktokUrl: p.tiktokUrl ?? p.member?.tiktokUrl ?? null,
  }));

  return { dedupMembers, dedupProfiles };
}

/** Re-key mapped rows: the client sends `mapping` (sourceColumn -> targetField) + raw rows. */
function applyMapping(payload: ImportPayload): MappedRow[] {
  const pairs = Object.entries(payload.mapping).filter(([, field]) => field !== "__skip");
  return payload.rows.map((row) => {
    const values: MappedRow["values"] = {};
    for (const [sourceColumn, field] of pairs) {
      const raw = row.values[sourceColumn];
      if (raw != null && String(raw).trim()) {
        values[field as Exclude<typeof field, "__skip">] = String(raw).trim();
      }
    }
    return { rowNumber: row.rowNumber, values };
  });
}

export async function previewImport(payloadInput: ImportPayload): Promise<ImportPreviewResult> {
  let actor;
  try {
    actor = await requireImporter();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const parsed = importPayloadSchema.safeParse(payloadInput);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid import payload." };

  const mappedRows = applyMapping(parsed.data);
  const { dedupMembers, dedupProfiles } = await loadDedupData(actor.organizationId);
  const indexes = buildDedupIndexes({ members: dedupMembers, profiles: dedupProfiles });

  const rows: ImportPreviewRow[] = [];
  const summary: ImportPreview["summary"] = {
    totalRows: mappedRows.length,
    valid: 0,
    newCount: 0,
    updateCount: 0,
    duplicateCount: 0,
    errorCount: 0,
    blankCount: 0,
    missingCategories: 0,
    missingLocations: 0,
    missingSocials: 0,
  };

  for (const mapped of mappedRows) {
    const validation = validateRow(mapped);
    if (validation.isBlank) {
      summary.blankCount += 1;
      rows.push({
        rowNumber: mapped.rowNumber,
        name: null,
        kind: "BLANK",
        matchedBy: null,
        targetProfileId: null,
        linkedMemberId: null,
        candidates: [],
        errors: [],
        warnings: [],
      });
      continue;
    }
    if (validation.errors.length > 0) {
      summary.errorCount += 1;
      rows.push({
        rowNumber: mapped.rowNumber,
        name: validation.normalized.name,
        kind: "ERROR",
        matchedBy: null,
        targetProfileId: null,
        linkedMemberId: null,
        candidates: [],
        errors: validation.errors,
        warnings: validation.warnings,
      });
      continue;
    }

    if (validation.warnings.includes("No categories")) summary.missingCategories += 1;
    if (validation.warnings.includes("No location")) summary.missingLocations += 1;
    if (validation.warnings.includes("No social links")) summary.missingSocials += 1;

    const classification = classifyRow(validation.normalized, indexes);
    const base = {
      rowNumber: mapped.rowNumber,
      name: validation.normalized.name,
      errors: [] as string[],
      warnings: validation.warnings,
    };

    if (classification.kind === "NEW") {
      summary.newCount += 1;
      summary.valid += 1;
      rows.push({
        ...base,
        kind: "NEW",
        matchedBy: classification.matchedBy,
        targetProfileId: null,
        linkedMemberId: classification.linkedMemberId,
        candidates: [],
      });
    } else if (classification.kind === "UPDATE_EXISTING") {
      summary.updateCount += 1;
      summary.valid += 1;
      rows.push({
        ...base,
        kind: "UPDATE_EXISTING",
        matchedBy: classification.matchedBy,
        targetProfileId: classification.profileId,
        linkedMemberId: classification.linkedMemberId,
        candidates: [],
      });
    } else {
      summary.duplicateCount += 1;
      rows.push({
        ...base,
        kind: "POSSIBLE_DUPLICATE",
        matchedBy: null,
        targetProfileId: null,
        linkedMemberId: null,
        candidates: classification.candidates,
      });
    }
  }

  return { success: true, preview: { summary, rows } };
}

// ---------------------------------------------------------------------------
// runImport
// ---------------------------------------------------------------------------

type ReportEntry = { rowNumber: number; name: string | null; outcome: "created" | "updated" | "skipped" | "error"; detail: string };

/** The CSV-derived fields for a brand-new profile (linked or standalone). */
function newProfileFields(row: NormalizedRow, linkedMemberId: string | null) {
  const standalone = linkedMemberId == null;
  return {
    name: standalone ? row.name : null,
    email: standalone ? row.email : null,
    phone: standalone ? row.phone : null,
    usernameHandle: standalone ? row.username : null,
    companyName: standalone ? row.companyName : null,
    instagramUrl: row.instagramUrl,
    tiktokUrl: row.tiktokUrl,
    youtubeUrl: row.youtubeUrl,
    websiteUrl: row.websiteUrl,
    imageUrl: row.profileImageUrl,
    libraryBio: row.bio,
    categories: row.categories,
    country: row.country,
    state: row.state,
    city: row.city,
    instagramFollowers: row.instagramFollowers,
    tiktokFollowers: row.tiktokFollowers,
    youtubeSubscribers: row.youtubeSubscribers,
  };
}

type ExistingProfile = {
  id: string;
  memberId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  usernameHandle: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  websiteUrl: string | null;
  companyName: string | null;
  imageUrl: string | null;
  libraryBio: string | null;
  categories: ContentCategory[];
  country: string | null;
  state: string | null;
  city: string | null;
  instagramFollowers: number | null;
  tiktokFollowers: number | null;
  youtubeSubscribers: number | null;
  publishedAt: Date | null;
};

function buildUpdateData(
  row: NormalizedRow,
  existing: ExistingProfile,
  mode: "FILL_MISSING" | "UPDATE_SELECTED",
  selected: Set<string>,
): Prisma.CreatorLibraryProfileUpdateInput {
  const data: Prisma.CreatorLibraryProfileUpdateInput = {};
  const isStandalone = existing.memberId == null;

  // pairs of [target field key, csv value, existing value] — string fields
  const stringPairs: [string, string | null, string | null][] = [
    ...(isStandalone
      ? ([
          ["name", row.name, existing.name],
          ["email", row.email, existing.email],
          ["phone", row.phone, existing.phone],
          ["username", row.username, existing.usernameHandle],
          ["company", row.companyName, existing.companyName],
        ] as [string, string | null, string | null][])
      : []),
    ["instagramUrl", row.instagramUrl, existing.instagramUrl],
    ["tiktokUrl", row.tiktokUrl, existing.tiktokUrl],
    ["youtubeUrl", row.youtubeUrl, existing.youtubeUrl],
    ["website", row.websiteUrl, existing.websiteUrl],
    ["profileImageUrl", row.profileImageUrl, existing.imageUrl],
    ["bio", row.bio, existing.libraryBio],
    ["country", row.country, existing.country],
    ["state", row.state, existing.state],
    ["city", row.city, existing.city],
  ];

  const fieldToColumn: Record<string, keyof Prisma.CreatorLibraryProfileUpdateInput> = {
    name: "name",
    email: "email",
    phone: "phone",
    username: "usernameHandle",
    company: "companyName",
    instagramUrl: "instagramUrl",
    tiktokUrl: "tiktokUrl",
    youtubeUrl: "youtubeUrl",
    website: "websiteUrl",
    profileImageUrl: "imageUrl",
    bio: "libraryBio",
    country: "country",
    state: "state",
    city: "city",
  };

  for (const [field, csvValue, existingValue] of stringPairs) {
    if (csvValue == null) continue;
    const write =
      mode === "UPDATE_SELECTED" ? selected.has(field) : !existingValue || !existingValue.trim();
    if (write) (data[fieldToColumn[field]] as unknown as string) = csvValue;
  }

  // follower counts
  const countPairs: [string, keyof Prisma.CreatorLibraryProfileUpdateInput, number | null, number | null][] = [
    ["instagramFollowers", "instagramFollowers", row.instagramFollowers, existing.instagramFollowers],
    ["tiktokFollowers", "tiktokFollowers", row.tiktokFollowers, existing.tiktokFollowers],
    ["youtubeSubscribers", "youtubeSubscribers", row.youtubeSubscribers, existing.youtubeSubscribers],
  ];
  for (const [field, column, csvValue, existingValue] of countPairs) {
    if (csvValue == null) continue;
    const write = mode === "UPDATE_SELECTED" ? selected.has(field) : existingValue == null;
    if (write) (data[column] as unknown as number) = csvValue;
  }

  // categories (merge on FILL_MISSING only when empty; replace on selected)
  if (row.categories.length > 0) {
    if (mode === "UPDATE_SELECTED" && (selected.has("primaryCategory") || selected.has("additionalCategories"))) {
      data.categories = [...new Set([...existing.categories, ...row.categories])];
    } else if (mode === "FILL_MISSING" && existing.categories.length === 0) {
      data.categories = row.categories;
    }
  }

  return data;
}

export async function runImport(payloadInput: ImportPayload): Promise<ImportRunResult> {
  let actor;
  try {
    actor = await requireImporter();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const parsed = importPayloadSchema.safeParse(payloadInput);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid import payload." };
  const payload = parsed.data;

  const mappedRows = applyMapping(payload);
  const { dedupMembers, dedupProfiles } = await loadDedupData(actor.organizationId);
  const indexes = buildDedupIndexes({ members: dedupMembers, profiles: dedupProfiles });

  const resolutions = new Map((payload.resolutions ?? []).map((r) => [r.rowNumber, r]));
  const selected = new Set(payload.selectedFields ?? []);
  const publish = payload.importMode === "PUBLISH";
  const now = new Date();

  // Pre-compute each row's final plan (no DB writes yet).
  type Plan =
    | { rowNumber: number; name: string | null; op: "skip"; detail: string }
    | { rowNumber: number; name: string | null; op: "create"; row: NormalizedRow; linkedMemberId: string | null }
    | { rowNumber: number; name: string | null; op: "update"; row: NormalizedRow; profileId: string };

  const plans: Plan[] = [];
  // In-batch dedup: a second row that would create a profile for the same
  // member / handle / email as an earlier NEW row is held back rather than
  // hitting a unique-constraint failure mid-transaction.
  const claimedMemberIds = new Set<string>();
  const claimedKeys = new Set<string>();

  for (const mapped of mappedRows) {
    const v = validateRow(mapped);
    if (v.isBlank) {
      plans.push({ rowNumber: mapped.rowNumber, name: null, op: "skip", detail: "blank row" });
      continue;
    }
    if (v.errors.length > 0) {
      plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "skip", detail: `error: ${v.errors.join("; ")}` });
      continue;
    }

    const resolution = resolutions.get(mapped.rowNumber);
    if (resolution?.action === "skip") {
      plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "skip", detail: "skipped by reviewer" });
      continue;
    }

    let classification = classifyRow(v.normalized, indexes);
    // reviewer override
    if (resolution?.action === "update" && resolution.profileId) {
      classification = { kind: "UPDATE_EXISTING", profileId: resolution.profileId, linkedMemberId: resolution.memberId ?? null, matchedBy: "reviewer" };
    } else if (resolution?.action === "new") {
      classification = { kind: "NEW", linkedMemberId: resolution.memberId ?? null, matchedBy: "reviewer" };
    }

    if (classification.kind === "POSSIBLE_DUPLICATE") {
      plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "skip", detail: "unresolved possible duplicate" });
      continue;
    }
    if (classification.kind === "NEW") {
      const dupKey =
        classification.linkedMemberId ??
        v.normalized.email ??
        v.normalized.instagramHandleKey ??
        v.normalized.tiktokHandleKey ??
        (v.normalized.name ? `name:${v.normalized.name.toLowerCase()}` : null);
      if (classification.linkedMemberId && claimedMemberIds.has(classification.linkedMemberId)) {
        plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "skip", detail: "duplicate of an earlier row in this file (same member)" });
        continue;
      }
      if (dupKey && claimedKeys.has(dupKey)) {
        plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "skip", detail: "duplicate of an earlier row in this file" });
        continue;
      }
      if (classification.linkedMemberId) claimedMemberIds.add(classification.linkedMemberId);
      if (dupKey) claimedKeys.add(dupKey);
      plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "create", row: v.normalized, linkedMemberId: classification.linkedMemberId });
    } else {
      if (payload.existingMode === "SKIP") {
        plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "skip", detail: "existing record, mode = skip" });
      } else {
        plans.push({ rowNumber: mapped.rowNumber, name: v.normalized.name, op: "update", row: v.normalized, profileId: classification.profileId });
      }
    }
  }

  const updateProfileIds = plans.filter((p): p is Extract<Plan, { op: "update" }> => p.op === "update").map((p) => p.profileId);
  const existingProfiles = updateProfileIds.length
    ? await prisma.creatorLibraryProfile.findMany({
        where: { id: { in: updateProfileIds } },
        select: {
          id: true, memberId: true, name: true, email: true, phone: true, usernameHandle: true,
          instagramUrl: true, tiktokUrl: true, youtubeUrl: true, websiteUrl: true, companyName: true,
          imageUrl: true, libraryBio: true, categories: true, country: true, state: true, city: true,
          instagramFollowers: true, tiktokFollowers: true, youtubeSubscribers: true, publishedAt: true,
        },
      })
    : [];
  const existingById = new Map(existingProfiles.map((p) => [p.id, p as ExistingProfile]));

  const report: ReportEntry[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const batchId = await prisma.$transaction(
      async (tx) => {
        const batch = await tx.creatorImportBatch.create({
          data: {
            organizationId: actor.organizationId,
            uploadedById: actor.id,
            fileName: payload.fileName,
            fileSizeBytes: payload.fileSizeBytes,
            status: "PENDING",
            importMode: payload.importMode,
            existingMode: payload.existingMode,
            totalRows: mappedRows.length,
            mapping: payload.mapping as Prisma.InputJsonValue,
            startedAt: now,
          },
          select: { id: true },
        });

        for (const plan of plans) {
          if (plan.op === "skip") {
            skipped += 1;
            report.push({ rowNumber: plan.rowNumber, name: plan.name, outcome: "skipped", detail: plan.detail });
            continue;
          }
          if (plan.op === "create") {
            await tx.creatorLibraryProfile.create({
              data: {
                organizationId: actor.organizationId,
                memberId: plan.linkedMemberId,
                addedById: actor.id,
                importBatchId: batch.id,
                sourceRowNumber: plan.rowNumber,
                visible: publish,
                publishedAt: publish ? now : null,
                ...newProfileFields(plan.row, plan.linkedMemberId),
              },
            });
            created += 1;
            report.push({
              rowNumber: plan.rowNumber,
              name: plan.name,
              outcome: "created",
              detail: `${plan.linkedMemberId ? "linked" : "standalone"}${publish ? ", published" : ", draft"}`,
            });
            continue;
          }
          // update
          const existing = existingById.get(plan.profileId);
          if (!existing) {
            skipped += 1;
            report.push({ rowNumber: plan.rowNumber, name: plan.name, outcome: "skipped", detail: "target profile vanished" });
            continue;
          }
          const data = buildUpdateData(
            plan.row,
            existing,
            payload.existingMode === "UPDATE_SELECTED" ? "UPDATE_SELECTED" : "FILL_MISSING",
            selected as Set<string>,
          );
          data.importBatch = { connect: { id: batch.id } };
          data.sourceRowNumber = plan.rowNumber;
          if (publish) {
            data.visible = true;
            // stamp publishedAt only if not already published
            if (!existing.publishedAt) data.publishedAt = now;
          }
          await tx.creatorLibraryProfile.update({ where: { id: plan.profileId }, data });
          updated += 1;
          const touched = Object.keys(data).filter((k) => !["importBatch", "sourceRowNumber", "visible", "publishedAt"].includes(k));
          report.push({
            rowNumber: plan.rowNumber,
            name: plan.name,
            outcome: "updated",
            detail: touched.length ? `updated ${touched.join(", ")}` : "no fields changed",
          });
        }

        await tx.creatorImportBatch.update({
          where: { id: batch.id },
          data: {
            status: "COMPLETED",
            createdCount: created,
            updatedCount: updated,
            skippedCount: skipped,
            errorCount: report.filter((r) => r.outcome === "error").length,
            report: report as unknown as Prisma.InputJsonValue,
            completedAt: new Date(),
          },
        });

        return batch.id;
      },
      { timeout: 120_000, maxWait: 15_000 },
    );

    await logAudit({
      organizationId: actor.organizationId,
      actorId: actor.id,
      action: "creator_library.import_completed",
      entityType: "CreatorImportBatch",
      entityId: batchId,
      after: { fileName: payload.fileName, created, updated, skipped },
    });

    revalidatePath("/creator-library");
    revalidatePath("/admin/creator-library");
    revalidatePath("/admin/creator-library/imports");

    return { success: true, batchId, created, updated, skipped, errors: report.filter((r) => r.outcome === "error").length };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Import failed while writing to the database." };
  }
}

/** Ops resolves a standalone profile to a real Member (spec §10). */
export async function linkStandaloneProfileToMember(
  profileId: string,
  memberId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  let actor;
  try {
    actor = await requireImporter();
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Not authorized." };
  }

  const [profile, member] = await Promise.all([
    prisma.creatorLibraryProfile.findFirst({ where: { id: profileId, organizationId: actor.organizationId }, select: { id: true, memberId: true } }),
    prisma.member.findFirst({ where: { id: memberId, organizationId: actor.organizationId, role: "CREATOR", deletedAt: null }, select: { id: true, creatorLibraryProfile: { select: { id: true } } } }),
  ]);
  if (!profile) return { success: false, error: "Profile not found." };
  if (profile.memberId) return { success: false, error: "This profile is already linked to a member." };
  if (!member) return { success: false, error: "That creator isn't available." };
  if (member.creatorLibraryProfile) return { success: false, error: "That member already has a library profile." };

  await prisma.creatorLibraryProfile.update({ where: { id: profileId }, data: { memberId } });
  await logAudit({
    organizationId: actor.organizationId,
    actorId: actor.id,
    action: "creator_library.profile_linked",
    entityType: "CreatorLibraryProfile",
    entityId: profileId,
    after: { memberId },
  });
  revalidatePath("/admin/creator-library");
  revalidatePath("/creator-library");
  return { success: true };
}
