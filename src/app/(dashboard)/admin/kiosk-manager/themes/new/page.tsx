import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KioskThemeEditor } from "@/features/kiosk/components/admin/kiosk-theme-editor";
import { KIOSK_NAME, KIOSK_LOCATION } from "@/features/kiosk/config";

export const dynamic = "force-dynamic";

export const metadata = { title: "New Kiosk Theme" };

export default async function NewKioskThemePage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "kiosk.manage")) redirect("/dashboard");

  const events = await prisma.event.findMany({
    where: { organizationId: actor.organizationId, endTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    select: { id: true, title: true },
    take: 50,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Theme"
        description="Design a new kiosk theme with a live preview."
        actions={
          <Link href="/admin/kiosk-manager" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted">
            <ArrowLeft className="size-4" /> Kiosk Manager
          </Link>
        }
      />
      <KioskThemeEditor events={events} kioskName={KIOSK_NAME} kioskLocation={KIOSK_LOCATION} />
    </div>
  );
}
