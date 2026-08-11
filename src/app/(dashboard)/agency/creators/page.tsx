import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Users } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MemberStatusBadge } from "@/features/members/components/member-status-badge";
import { formatCompactCurrency } from "@/lib/utils/format";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { listCreatorsForAgency } from "@/features/agencies/services/creator-roster.service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creators" };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatRateCard(rateCard: unknown) {
  if (!rateCard || typeof rateCard !== "object") return "—";
  const entries = Object.entries(rateCard as Record<string, unknown>);
  if (entries.length === 0) return "—";
  return entries.map(([k, v]) => `${k}: $${v}`).join(", ");
}

export default async function AgencyCreatorsPage() {
  const actor = await requireCurrentMember();
  if (actor.role !== "AGENCY") redirect("/dashboard");

  const agencyId = effectiveAgencyIdFor(actor);
  const creators = await listCreatorsForAgency(actor.organizationId, agencyId);

  return (
    <div className="space-y-6">
      <PageHeader title="Creators" description="Your connected creator roster — platform, followers, rate card, and performance." />

      {creators.length === 0 ? (
        <EmptyState icon={Users} title="No creators connected yet" description="Creators who apply with your Agency ID will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Creator</TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Followers</TableHead>
                <TableHead>Categories</TableHead>
                <TableHead>Rate Card</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Connected</TableHead>
                <TableHead className="text-right">GMV</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creators.map((creator) => (
                <TableRow key={creator.id}>
                  <TableCell>
                    <Link href={`/members/${creator.id}`} className="flex items-center gap-3">
                      <Avatar className="size-8">
                        {creator.profilePhotoUrl && <AvatarImage src={creator.profilePhotoUrl} alt={creator.fullName} />}
                        <AvatarFallback className="text-xs">{initials(creator.fullName)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{creator.fullName}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {creator.platforms.length > 0 ? creator.platforms.join(", ") : "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {creator.followerCount?.toLocaleString() ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {creator.contentCategories.length > 0 ? (
                        creator.contentCategories.slice(0, 2).map((cat) => (
                          <Badge key={cat} variant="outline" className="text-xs capitalize">
                            {cat.toLowerCase()}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {formatRateCard(creator.rateCard)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={creator.availableForCollab ? "border-success/20 bg-success/10 text-success" : "border-transparent bg-muted text-muted-foreground"}>
                      {creator.availableForCollab ? "Available" : "Unavailable"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <MemberStatusBadge status={creator.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(creator.memberSince, "MMM d, yyyy")}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">
                    {formatCompactCurrency(Number(creator.currentGMV))}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                    {formatCompactCurrency(Number(creator.currentCommission))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
