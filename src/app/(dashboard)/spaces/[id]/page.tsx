import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { getSpaceDetail } from "@/features/spaces/services/spaces.service";
import { hasPermission } from "@/lib/permissions";
import { QRCodeDisplay } from "@/features/qr/components/qr-code-display";
import { ActiveSessionCard } from "@/features/spaces/components/active-session-card";
import { SpaceSessionHistoryTable } from "@/features/spaces/components/space-session-history-table";
import { SPACE_TYPE_META, SPACE_CATEGORY_META } from "@/features/spaces/components/space-card";
import { SpaceStatusBadge } from "@/features/spaces/components/space-status-badge";
import { getSpaceCategory, SPACE_CATEGORY_LABELS, SPACE_CATEGORY_COPY } from "@/lib/utils/space-category";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, CalendarPlus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SpaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireCurrentMember();
  const canManage = hasPermission(actor.systemRole, "spaces.manage");
  const detail = await getSpaceDetail(actor.organizationId, id);
  if (!detail) notFound();
  // Archived spaces "disappear from... public availability" — only admins
  // who can manage spaces get to view one directly by URL/QR after it's
  // been archived; everyone else gets the same 404 as a space that never existed.
  if (!detail.space.isActive && !canManage) notFound();

  const { space, activeSession, history } = detail;
  const typeMeta = SPACE_TYPE_META[space.type];
  const Icon = typeMeta.icon;
  const category = getSpaceCategory(space.type);
  const categoryMeta = SPACE_CATEGORY_META[category];
  // getSpaceDetail doesn't compute the full AVAILABLE/OCCUPIED/RESERVED status
  // the Spaces list does (that requires the reservations-aware query) — this
  // is a simplified two-state read (an active session vs. not) rather than a
  // second data fetch, since the plan calls for reusing getSpaceDetail as-is.
  const status = activeSession ? "OCCUPIED" : "AVAILABLE";

  return (
    <div className="space-y-8">
      <div
        className={`relative flex flex-col justify-end gap-3 overflow-hidden rounded-2xl border p-6 sm:h-56 ${categoryMeta.accent}`}
      >
        <Icon className="pointer-events-none absolute -right-4 -bottom-4 size-32 opacity-10" />
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-background/70">
            {SPACE_CATEGORY_LABELS[category]}
          </Badge>
          {space.isActive ? (
            <SpaceStatusBadge status={status} />
          ) : (
            <Badge variant="outline" className="bg-background/70 text-muted-foreground">
              Archived
            </Badge>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{space.name}</h1>
          <p className="mt-1 max-w-xl text-sm text-foreground/80">
            {space.description || SPACE_CATEGORY_COPY[category]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" /> {typeMeta.label}
            {space.capacity && ` · Seats ${space.capacity}`}
          </span>
        </div>
        {space.equipment.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {space.equipment.map((item) => (
              <Badge key={item} variant="secondary" className="bg-background/70 text-xs font-normal">
                {item}
              </Badge>
            ))}
          </div>
        )}
        {space.isActive ? (
          <Button asChild className="w-fit">
            <Link href={`/spaces?space=${space.id}`}>
              <CalendarPlus className="size-4" /> Book this space
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-foreground/70">
            This space is archived and isn&apos;t available for booking.
          </p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {activeSession ? (
            <ActiveSessionCard
              session={{
                id: activeSession.id,
                startedAt: activeSession.startedAt,
                member: activeSession.member,
                project: activeSession.project,
              }}
            />
          ) : (
            <Card className="border shadow-sm">
              <CardContent className="p-4 text-sm text-muted-foreground">
                This space is available. Scan its QR code from the Spaces page to start a session.
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Session history</CardTitle>
            </CardHeader>
            <CardContent>
              <SpaceSessionHistoryTable
                sessions={history.map((s) => ({
                  id: s.id,
                  startedAt: s.startedAt,
                  finishedAt: s.finishedAt,
                  durationMin: s.durationMin,
                  member: s.member,
                  project: s.project,
                  brand: s.brand,
                  company: s.company,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        {space.qrAsset && <QRCodeDisplay token={space.qrAsset.token} label={space.name} />}
      </div>
    </div>
  );
}
