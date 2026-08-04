import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";
import type { MemberLegalAcceptanceView } from "@/features/legal/services/legal.service";

function formatDate(date: Date | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/**
 * Read-only: the current version of every required legal document plus the
 * member's own acceptance record for each. A minor publish shows "Newer
 * version available" (informational — no action needed); a major publish
 * the member hasn't re-accepted shows "Needs re-acceptance" (matches the
 * dashboard banner at /legal/reaccept). Nothing here needs to change when
 * an admin publishes a new version — it's all read from the DB.
 */
export function LegalSection({ acceptances }: { acceptances: MemberLegalAcceptanceView[] }) {
  return (
    <SettingsSectionCard
      id="legal"
      title="Legal"
      description="The agreements you accepted, and the current version of each."
    >
      <div className="space-y-3">
        {acceptances.map((doc) => (
          <div
            key={doc.documentType}
            className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.acceptedAt
                    ? `Accepted version ${doc.acceptedVersion} on ${formatDate(doc.acceptedAt)}`
                    : "Not yet accepted on this account"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:pl-4">
              {!doc.isCompliant && (
                <Badge
                  variant="outline"
                  className="border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                >
                  Needs re-acceptance
                </Badge>
              )}
              {doc.isCompliant && !doc.isCurrent && (
                <Badge
                  variant="outline"
                  className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  Newer version available
                </Badge>
              )}
              {doc.isCurrent && (
                <Badge
                  variant="outline"
                  className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  Up to date
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">v{doc.currentVersion}</span>
              <Link
                href={doc.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View
                <ExternalLink className="size-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
