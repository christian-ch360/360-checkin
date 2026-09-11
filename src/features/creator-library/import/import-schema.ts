import { z } from "zod";

/**
 * Every field a CSV column can be mapped to (spec §3). `__skip` = "Do not
 * import". Parsing happens client-side; the server only ever receives rows
 * already keyed by these field names.
 */
export const TARGET_FIELDS = [
  "__skip",
  // required
  "name",
  // identity
  "memberId",
  "email",
  "phone",
  "username",
  "profileImageUrl",
  // social
  "instagramHandle",
  "instagramUrl",
  "instagramFollowers",
  "tiktokHandle",
  "tiktokUrl",
  "tiktokFollowers",
  "youtubeHandle",
  "youtubeUrl",
  "youtubeSubscribers",
  // organization
  "primaryCategory",
  "additionalCategories",
  "country",
  "state",
  "city",
  // other
  "bio",
  "website",
  "company",
  "creatorType",
] as const;

export type TargetField = (typeof TARGET_FIELDS)[number];

export const TARGET_FIELD_GROUPS: { label: string; fields: { field: TargetField; label: string }[] }[] = [
  {
    label: "Required",
    fields: [{ field: "name", label: "Creator Name" }],
  },
  {
    label: "Identity",
    fields: [
      { field: "memberId", label: "Existing Member ID" },
      { field: "email", label: "Email" },
      { field: "phone", label: "Phone" },
      { field: "username", label: "Username" },
      { field: "profileImageUrl", label: "Profile Image URL" },
    ],
  },
  {
    label: "Social",
    fields: [
      { field: "instagramHandle", label: "Instagram Handle" },
      { field: "instagramUrl", label: "Instagram URL" },
      { field: "instagramFollowers", label: "Instagram Followers" },
      { field: "tiktokHandle", label: "TikTok Handle" },
      { field: "tiktokUrl", label: "TikTok URL" },
      { field: "tiktokFollowers", label: "TikTok Followers" },
      { field: "youtubeHandle", label: "YouTube Handle" },
      { field: "youtubeUrl", label: "YouTube URL" },
      { field: "youtubeSubscribers", label: "YouTube Subscribers" },
    ],
  },
  {
    label: "Organization",
    fields: [
      { field: "primaryCategory", label: "Primary Category" },
      { field: "additionalCategories", label: "Additional Categories" },
      { field: "country", label: "Country" },
      { field: "state", label: "State / Province" },
      { field: "city", label: "City" },
    ],
  },
  {
    label: "Other",
    fields: [
      { field: "bio", label: "Bio" },
      { field: "website", label: "Website" },
      { field: "company", label: "Company" },
      { field: "creatorType", label: "Creator Type" },
    ],
  },
];

export const TARGET_FIELD_LABELS: Record<TargetField, string> = Object.fromEntries([
  ["__skip", "— Do not import —"],
  ...TARGET_FIELD_GROUPS.flatMap((g) => g.fields.map((f) => [f.field, f.label] as const)),
]) as Record<TargetField, string>;

/** A raw source row after mapping: target field -> raw cell string. */
export type MappedRow = { rowNumber: number; values: Partial<Record<Exclude<TargetField, "__skip">, string>> };

export const importModeSchema = z.enum(["DRAFT", "PUBLISH"]);
export const existingModeSchema = z.enum(["SKIP", "FILL_MISSING", "UPDATE_SELECTED"]);

/** Ops decision for one ambiguous row in the Review step. */
export const rowResolutionSchema = z.object({
  rowNumber: z.number().int(),
  action: z.enum(["new", "update", "skip"]),
  /** target CreatorLibraryProfile id when action === "update" and it's a profile match */
  profileId: z.string().uuid().nullable().optional(),
  /** target Member id when linking a new/updated profile to a member */
  memberId: z.string().uuid().nullable().optional(),
});
export type RowResolution = z.infer<typeof rowResolutionSchema>;

export const mappedRowSchema = z.object({
  rowNumber: z.number().int(),
  values: z.record(z.string(), z.string()),
});

export const importPayloadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSizeBytes: z.number().int().nonnegative().nullable(),
  mapping: z.record(z.string(), z.enum(TARGET_FIELDS)),
  rows: z.array(mappedRowSchema).min(1).max(10_000),
  importMode: importModeSchema,
  existingMode: existingModeSchema,
  /** Fields to write when existingMode === "UPDATE_SELECTED". */
  selectedFields: z.array(z.enum(TARGET_FIELDS)).optional(),
  resolutions: z.array(rowResolutionSchema).optional(),
});
export type ImportPayload = z.infer<typeof importPayloadSchema>;
