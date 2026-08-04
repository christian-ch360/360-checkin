import Link from "next/link";
import { format } from "date-fns";
import { ExternalLink, FileText } from "lucide-react";
import type { LegalDocumentType } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { statusToneClass } from "@/lib/utils/status-colors";
import { getDocumentHref } from "@/features/legal/documents";
import type { DocumentManagementCard as DocumentManagementCardData } from "@/features/legal/services/compliance.service";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function DocumentManagementCard({ doc }: { doc: DocumentManagementCardData }) {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="size-4.5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{doc.title}</p>
            <p className="text-xs text-muted-foreground">
              Version {doc.currentVersion}
              {doc.effectiveDate ? ` · Effective ${format(new Date(`${doc.effectiveDate}T00:00:00Z`), "MMM d, yyyy")}` : ""}
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={statusToneClass[doc.status === "PUBLISHED" ? "success" : "neutral"]}
        >
          {doc.status === "PUBLISHED" ? "Published" : "No published version"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
          <StatRow label="Total acceptances" value={String(doc.totalAcceptances)} />
          <StatRow label="Members on current version" value={String(doc.membersOnCurrentVersion)} />
          <StatRow label="Members on older versions" value={String(doc.membersOnOlderVersion)} />
          <StatRow label="Last updated" value={doc.lastUpdated ? format(doc.lastUpdated, "MMM d, yyyy") : "—"} />
        </div>

        {doc.hasDraft && (
          <Badge variant="outline" className={statusToneClass.info}>
            Draft in progress
          </Badge>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/legal/${doc.documentType}`}>Manage</Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={getDocumentHref(doc.documentType as unknown as LegalDocumentType)} target="_blank" rel="noopener noreferrer">
              View live
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
