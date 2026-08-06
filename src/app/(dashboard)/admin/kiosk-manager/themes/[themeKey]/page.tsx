import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { getThemeByKey, getThemeVersionHistory } from "@/features/kiosk/services/kiosk-theme.service";
import { KioskThemeEditor } from "@/features/kiosk/components/admin/kiosk-theme-editor";
import { KIOSK_NAME, KIOSK_LOCATION } from "@/features/kiosk/config";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit Kiosk Theme" };

export default async function EditKioskThemePage({ params }: { params: Promise<{ themeKey: string }> }) {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "kiosk.manage")) redirect("/dashboard");

  const { themeKey } = await params;

  const [latest, versionHistory, events] = await Promise.all([
    getThemeByKey(actor.organizationId, themeKey),
    getThemeVersionHistory(actor.organizationId, themeKey),
    prisma.event.findMany({
      where: { organizationId: actor.organizationId, endTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      select: { id: true, title: true },
      take: 50,
    }),
  ]);

  if (!latest) notFound();

  return (
    <div className="space-y-8">
      <PageHeader
        title={latest.name}
        description={`Editing version ${latest.version} · ${latest.status}`}
        actions={
          <Link href="/admin/kiosk-manager" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted">
            <ArrowLeft className="size-4" /> Kiosk Manager
          </Link>
        }
      />
      <KioskThemeEditor
        themeKey={themeKey}
        latest={latest}
        versionHistory={versionHistory}
        events={events}
        kioskName={KIOSK_NAME}
        kioskLocation={KIOSK_LOCATION}
      />
    </div>
  );
}
