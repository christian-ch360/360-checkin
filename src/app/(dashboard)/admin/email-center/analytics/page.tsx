import { redirect } from "next/navigation";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { getCachedEmailAnalyticsData } from "@/features/communications/services/email-analytics.service";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { EmailAnalyticsCharts } from "@/features/communications/components/email-analytics-charts";

export const dynamic = "force-dynamic";

export const metadata = { title: "Email Analytics" };

export default async function EmailCenterAnalyticsPage() {
  const actor = await requireCurrentMember();
  if (!hasPermission(actor.systemRole, "admin.access")) {
    redirect("/dashboard");
  }

  const data = await getCachedEmailAnalyticsData(actor.organizationId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Analytics"
        description="Delivery trends, template usage, and failure rate across every email sent."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/email-center">
              <Inbox className="size-4" />
              Back to Email Center
            </Link>
          </Button>
        }
      />

      <EmailAnalyticsCharts data={data} />
    </div>
  );
}
