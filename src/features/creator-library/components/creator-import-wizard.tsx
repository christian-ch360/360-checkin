"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ArrowLeft, ArrowRight, CheckCircle2, Download, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  TARGET_FIELD_GROUPS,
  TARGET_FIELD_LABELS,
  type TargetField,
} from "@/features/creator-library/import/import-schema";
import {
  previewImport,
  runImport,
  type ImportPreview,
  type ImportRunResult,
} from "@/features/creator-library/import/import-actions";

type RawRow = Record<string, string>;

const AUTO_MAP: { field: TargetField; patterns: RegExp }[] = [
  { field: "name", patterns: /^(full[_\s-]?name|name|creator[_\s-]?name|display[_\s-]?name)$/i },
  { field: "memberId", patterns: /^(member[_\s-]?id|memberid|c360[_\s-]?id|ch360[_\s-]?id)$/i },
  { field: "email", patterns: /^(e[-_\s]?mail|email[_\s-]?address)$/i },
  { field: "phone", patterns: /^(phone|phone[_\s-]?number|mobile|tel)$/i },
  { field: "username", patterns: /^(user[_\s-]?name|handle|c360[_\s-]?username|ch360[_\s-]?username)$/i },
  { field: "profileImageUrl", patterns: /^(profile[_\s-]?image[_\s-]?url|photo[_\s-]?url|avatar[_\s-]?url|image[_\s-]?url|profile[_\s-]?photo)$/i },
  { field: "instagramFollowers", patterns: /instagram.*(follow)|ig.*follow/i },
  { field: "instagramUrl", patterns: /instagram.*url|ig.*url/i },
  { field: "instagramHandle", patterns: /^(instagram|ig|instagram[_\s-]?handle|insta)$/i },
  { field: "tiktokFollowers", patterns: /tik.?tok.*follow|tt.*follow/i },
  { field: "tiktokUrl", patterns: /tik.?tok.*url/i },
  { field: "tiktokHandle", patterns: /^(tik.?tok|tt|tik.?tok[_\s-]?handle)$/i },
  { field: "youtubeSubscribers", patterns: /you.?tube.*(sub|follow)|yt.*sub/i },
  { field: "youtubeUrl", patterns: /you.?tube.*url|yt.*url/i },
  { field: "youtubeHandle", patterns: /^(you.?tube|yt|you.?tube[_\s-]?handle|channel)$/i },
  { field: "primaryCategory", patterns: /^(primary[_\s-]?category|category|main[_\s-]?category|niche)$/i },
  { field: "additionalCategories", patterns: /^(additional[_\s-]?categories|categories|other[_\s-]?categories|tags|secondary[_\s-]?categories)$/i },
  { field: "country", patterns: /^(country|nation)$/i },
  { field: "state", patterns: /^(state|province|state[_\s-]?province|region)$/i },
  { field: "city", patterns: /^(city|town|metro)$/i },
  { field: "bio", patterns: /^(bio|biography|about|description|summary)$/i },
  { field: "website", patterns: /^(website|site|url|web|link)$/i },
  { field: "company", patterns: /^(company|brand|agency|organization|org)$/i },
  { field: "creatorType", patterns: /^(creator[_\s-]?type|type|member[_\s-]?type)$/i },
];

function autoDetect(headers: string[]): Record<string, TargetField> {
  const used = new Set<TargetField>();
  const mapping: Record<string, TargetField> = {};
  for (const header of headers) {
    const clean = header.trim();
    const match = AUTO_MAP.find((m) => m.patterns.test(clean) && !used.has(m.field));
    if (match) {
      mapping[header] = match.field;
      used.add(match.field);
    } else {
      mapping[header] = "__skip";
    }
  }
  return mapping;
}

function sheetToRows(sheet: XLSX.WorkSheet): { headers: string[]; rows: RawRow[] } {
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headers = json.length > 0 ? Object.keys(json[0]) : [];
  const rows = json.map((r) => {
    const out: RawRow = {};
    for (const key of headers) out[key] = r[key] == null ? "" : String(r[key]);
    return out;
  });
  return { headers, rows };
}

type ParsedFile = { sheetNames: string[]; sheets: Record<string, { headers: string[]; rows: RawRow[] }> };

async function parseFile(file: File): Promise<ParsedFile> {
  if (/\.xlsx?$/i.test(file.name)) {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheets: ParsedFile["sheets"] = {};
    for (const name of wb.SheetNames) sheets[name] = sheetToRows(wb.Sheets[name]);
    return { sheetNames: wb.SheetNames, sheets };
  }
  const text = await file.text();
  const parsed = Papa.parse<RawRow>(text, { header: true, skipEmptyLines: "greedy" });
  return {
    sheetNames: ["CSV"],
    sheets: { CSV: { headers: parsed.meta.fields ?? [], rows: parsed.data } },
  };
}

export function CreatorImportWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [mapping, setMapping] = useState<Record<string, TargetField>>({});

  const headers = parsed && activeSheet ? (parsed.sheets[activeSheet]?.headers ?? []) : [];
  const rows = parsed && activeSheet ? (parsed.sheets[activeSheet]?.rows ?? []) : [];

  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [resolutions, setResolutions] = useState<Record<number, "new" | "update" | "skip">>({});

  const [importMode, setImportMode] = useState<"DRAFT" | "PUBLISH">("DRAFT");
  const [existingMode, setExistingMode] = useState<"SKIP" | "FILL_MISSING" | "UPDATE_SELECTED">("FILL_MISSING");
  const [selectedFields, setSelectedFields] = useState<TargetField[]>([]);
  const [result, setResult] = useState<Extract<ImportRunResult, { success: true }> | null>(null);

  const nameMapped = useMemo(() => Object.values(mapping).includes("name"), [mapping]);

  function selectSheet(p: ParsedFile, name: string) {
    setActiveSheet(name);
    setMapping(autoDetect(p.sheets[name]?.headers ?? []));
  }

  async function handleFile(file: File) {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File is larger than 8MB.");
      return;
    }
    try {
      const p = await parseFile(file);
      const firstNonEmpty = p.sheetNames.find((n) => p.sheets[n].headers.length > 0 && p.sheets[n].rows.length > 0);
      if (!firstNonEmpty) {
        toast.error("Couldn't read any rows from that file.");
        return;
      }
      setFileName(file.name);
      setFileSize(file.size);
      setParsed(p);
      selectSheet(p, firstNonEmpty);
      setStep(2);
    } catch {
      toast.error("Couldn't parse the file. Make sure it's a valid CSV or XLSX.");
    }
  }

  function buildPayload() {
    const previewByRow = new Map((preview?.rows ?? []).map((r) => [r.rowNumber, r]));
    return {
      fileName,
      fileSizeBytes: fileSize,
      mapping,
      rows: rows.map((values, i) => ({ rowNumber: i + 1, values })),
      importMode,
      existingMode,
      selectedFields: existingMode === "UPDATE_SELECTED" ? selectedFields : undefined,
      resolutions: Object.entries(resolutions).map(([rowNumber, action]) => {
        const rn = Number(rowNumber);
        const pv = previewByRow.get(rn);
        return {
          rowNumber: rn,
          action,
          profileId: action === "update" ? (pv?.targetProfileId ?? pv?.candidates.find((c) => c.profileId)?.profileId ?? null) : null,
          memberId: pv?.linkedMemberId ?? null,
        };
      }),
    };
  }

  function goPreview() {
    startTransition(async () => {
      const res = await previewImport(buildPayload());
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setPreview(res.preview);
      setStep(3);
    });
  }

  function confirmImport() {
    startTransition(async () => {
      const res = await runImport(buildPayload());
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setResult(res);
      setStep(4);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} />

      {step === 1 && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <label
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-14 text-center transition-colors",
                dragging ? "border-[var(--community)] bg-[var(--community)]/5" : "border-border hover:border-foreground/30",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
            >
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <UploadCloud className="size-6" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.16em]">Drop your CSV here</span>
              <span className="text-xs text-muted-foreground">or</span>
              <span className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]">
                Browse files
              </span>
              <span className="mt-1 text-xs text-muted-foreground">CSV or XLSX · up to 8MB</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-3">
                <Button asChild variant="outline" size="sm">
                  <a href="/api/creator-library/template" download>
                    <Download className="size-3.5" />
                    Download CH360 template
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin/creator-library/imports">Import history</Link>
                </Button>
              </div>
            </div>

            <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              <li>• Follower counts: <code>1200000</code>, <code>1,200,000</code>, <code>100K</code>, <code>1.2M</code></li>
              <li>• Categories: comma-separated in one cell</li>
              <li>• Handles: <code>@name</code> or <code>name</code></li>
              <li>• The first row must be headers; blank fields are allowed</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-medium">Map columns</h2>
                <p className="text-sm text-muted-foreground">
                  {fileName} · {rows.length} rows · {headers.length} columns
                </p>
              </div>
            </div>

            {parsed && parsed.sheetNames.length > 1 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Sheet:</span>
                {parsed.sheetNames.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => selectSheet(parsed, name)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium",
                      activeSheet === name
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {name} <span className="opacity-60">({parsed.sheets[name]?.rows.length ?? 0})</span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">CSV column</th>
                    <th className="px-4 py-2.5 font-medium">Sample value</th>
                    <th className="px-4 py-2.5 font-medium">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header) => (
                    <tr key={header} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2.5 font-medium">{header}</td>
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-xs text-muted-foreground">
                        {rows.find((r) => r[header]?.trim())?.[header] ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <Select
                          value={mapping[header] ?? "__skip"}
                          onValueChange={(value) => setMapping((prev) => ({ ...prev, [header]: value as TargetField }))}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip">{TARGET_FIELD_LABELS.__skip}</SelectItem>
                            {TARGET_FIELD_GROUPS.map((group) => (
                              <SelectGroup key={group.label}>
                                <SelectLabel>{group.label}</SelectLabel>
                                {group.fields.map((f) => (
                                  <SelectItem key={f.field} value={f.field}>
                                    {f.label}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!nameMapped ? (
              <p className="text-sm text-destructive">Map a column to <strong>Creator Name</strong> to continue.</p>
            ) : null}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="size-3.5" />
                Back
              </Button>
              <Button size="sm" disabled={!nameMapped || isPending} onClick={goPreview}>
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Review
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && preview && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-base font-medium">Import summary</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Records" value={preview.summary.totalRows} />
              <Stat label="Valid" value={preview.summary.valid} tone="good" />
              <Stat label="New" value={preview.summary.newCount} />
              <Stat label="Update existing" value={preview.summary.updateCount} />
              <Stat label="Possible duplicates" value={preview.summary.duplicateCount} tone={preview.summary.duplicateCount ? "warn" : undefined} />
              <Stat label="Errors" value={preview.summary.errorCount} tone={preview.summary.errorCount ? "bad" : undefined} />
              <Stat label="Missing categories" value={preview.summary.missingCategories} tone={preview.summary.missingCategories ? "warn" : undefined} />
              <Stat label="Missing locations" value={preview.summary.missingLocations} tone={preview.summary.missingLocations ? "warn" : undefined} />
            </div>

            <div className="max-h-[26rem] overflow-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">Creator</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium">Resolve</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 400).map((row) => (
                    <tr key={row.rowNumber} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{row.rowNumber}</td>
                      <td className="px-3 py-2">{row.name ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2">
                        <StatusBadge kind={row.kind} matchedBy={row.matchedBy} />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {[...row.errors, ...row.warnings].join(" · ") || "—"}
                        {row.candidates.length > 0 ? (
                          <span className="block">
                            candidates: {row.candidates.map((c) => `${c.name} (${c.reason})`).join("; ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        {row.kind === "POSSIBLE_DUPLICATE" || row.kind === "NEW" || row.kind === "UPDATE_EXISTING" ? (
                          <Select
                            value={resolutions[row.rowNumber] ?? ""}
                            onValueChange={(v) =>
                              setResolutions((prev) => ({ ...prev, [row.rowNumber]: v as "new" | "update" | "skip" }))
                            }
                          >
                            <SelectTrigger className="h-7 w-[120px] text-xs">
                              <SelectValue placeholder="Default" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">Import as new</SelectItem>
                              {row.targetProfileId ? <SelectItem value="update">Update match</SelectItem> : null}
                              <SelectItem value="skip">Skip</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.rows.length > 400 ? (
              <p className="text-xs text-muted-foreground">Showing the first 400 rows; all {preview.rows.length} will be processed.</p>
            ) : null}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="size-3.5" />
                Back
              </Button>
              <Button size="sm" onClick={() => setStep(3.5)}>
                Import options
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3.5 && preview && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <h2 className="text-base font-medium">Import options</h2>

            <OptionGroup label="Import as">
              <ChoiceChip active={importMode === "DRAFT"} onClick={() => setImportMode("DRAFT")}>
                Draft (hidden)
              </ChoiceChip>
              <ChoiceChip active={importMode === "PUBLISH"} onClick={() => setImportMode("PUBLISH")}>
                Publish immediately
              </ChoiceChip>
            </OptionGroup>

            <OptionGroup label="Existing records">
              <ChoiceChip active={existingMode === "SKIP"} onClick={() => setExistingMode("SKIP")}>
                Skip
              </ChoiceChip>
              <ChoiceChip active={existingMode === "FILL_MISSING"} onClick={() => setExistingMode("FILL_MISSING")}>
                Update missing fields only
              </ChoiceChip>
              <ChoiceChip active={existingMode === "UPDATE_SELECTED"} onClick={() => setExistingMode("UPDATE_SELECTED")}>
                Update selected fields
              </ChoiceChip>
            </OptionGroup>

            {existingMode === "UPDATE_SELECTED" ? (
              <div className="flex flex-wrap gap-1.5">
                {TARGET_FIELD_GROUPS.flatMap((g) => g.fields)
                  .filter((f) => f.field !== "memberId" && f.field !== "username" || true)
                  .filter((f) => Object.values(mapping).includes(f.field))
                  .map((f) => (
                    <ChoiceChip
                      key={f.field}
                      active={selectedFields.includes(f.field)}
                      onClick={() =>
                        setSelectedFields((prev) =>
                          prev.includes(f.field) ? prev.filter((x) => x !== f.field) : [...prev, f.field],
                        )
                      }
                    >
                      {f.label}
                    </ChoiceChip>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Curated fields — Featured, a custom portrait, a custom bio, and manual follower overrides — are never
                overwritten unless you pick &quot;Update selected fields&quot; and choose them.
              </p>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                <ArrowLeft className="size-3.5" />
                Back
              </Button>
              <Button size="sm" disabled={isPending} onClick={confirmImport}>
                {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Run import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && result && (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <CheckCircle2 className="mx-auto size-10 text-[var(--success)]" />
            <h2 className="text-lg font-semibold">Import complete</h2>
            <p className="text-sm text-muted-foreground">
              {result.created} created · {result.updated} updated · {result.skipped} skipped
              {result.errors ? ` · ${result.errors} errors` : ""}
            </p>
            <div className="flex justify-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/creator-library/imports/${result.batchId}`}>View report</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/admin/creator-library">Back to creators</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Upload", "Map Fields", "Review", "Import"];
  const current = step >= 4 ? 4 : step >= 3 ? 3 : step;
  return (
    <ol className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border pb-4">
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-2.5">
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                active ? "text-foreground" : done ? "text-[var(--community)]" : "text-muted-foreground/50",
              )}
            >
              {String(n).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "text-[0.7rem] font-semibold uppercase tracking-[0.16em]",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p
        className={cn(
          "text-xl font-semibold tabular-nums",
          tone === "good" && "text-[var(--success)]",
          tone === "warn" && "text-[var(--warning)]",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </p>
      <p className="text-[0.7rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function StatusBadge({ kind, matchedBy }: { kind: string; matchedBy: string | null }) {
  const map: Record<string, string> = {
    NEW: "border-border bg-muted text-foreground",
    UPDATE_EXISTING: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400",
    POSSIBLE_DUPLICATE: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
    ERROR: "border-destructive/30 bg-destructive/10 text-destructive",
    BLANK: "border-border bg-muted/50 text-muted-foreground",
  };
  const label: Record<string, string> = {
    NEW: "New",
    UPDATE_EXISTING: "Update",
    POSSIBLE_DUPLICATE: "Duplicate?",
    ERROR: "Error",
    BLANK: "Blank",
  };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[0.65rem] font-medium", map[kind] ?? map.NEW)}>
      {label[kind] ?? kind}
      {matchedBy ? <span className="ml-1 opacity-70">· {matchedBy}</span> : null}
    </span>
  );
}

function OptionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ChoiceChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
