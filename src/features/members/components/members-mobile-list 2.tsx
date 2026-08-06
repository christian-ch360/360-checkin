import Link from "next/link";
import { Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MemberStatusBadge } from "@/features/members/components/member-status-badge";
import { TierBadge } from "@/features/members/components/tier-badge";
import type { MemberRow } from "@/features/members/components/members-table";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { formatCompactCurrency } from "@/lib/utils/format";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function MembersMobileList({ data }: { data: MemberRow[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card py-12 text-center text-sm text-muted-foreground md:hidden">
        No members found.
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {data.map((m) => (
        <div key={m.id} className="rounded-xl border bg-card p-4">
          <Link href={`/members/${m.id}`} className="flex items-center gap-3">
            <Avatar className="size-11">
              {m.profilePhotoUrl && <AvatarImage src={m.profilePhotoUrl} alt={m.fullName} />}
              <AvatarFallback>{initials(m.fullName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{m.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{m.memberNumber}</p>
            </div>
            <MemberStatusBadge status={m.status} />
          </Link>

          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {ROLE_LABELS[m.role]}
              {m.company ? ` · ${m.company.name}` : ""}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between">
            {m.commissionTier ? (
              <TierBadge code={m.commissionTier.code} percentage={m.commissionTier.percentage} />
            ) : (
              <span className="text-sm text-muted-foreground">No tier</span>
            )}
            <span className="text-sm font-medium">{formatCompactCurrency(Number(m.currentGMV))}</span>
          </div>

          <div className="mt-3 flex gap-2 border-t pt-3">
            <Button asChild variant="outline" size="sm" className="h-12 flex-1 text-base">
              <Link href={`/members/${m.id}`}>View</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-12 flex-1 text-base">
              <a href={`mailto:${m.email}`}>
                <Mail className="size-4" /> Email
              </a>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
