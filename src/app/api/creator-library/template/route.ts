import { getCurrentMember } from "@/features/auth/services/current-member";
import { hasPermission } from "@/lib/permissions";
import { buildTemplateCsv } from "@/features/creator-library/import/template";

export const dynamic = "force-dynamic";

export async function GET() {
  const member = await getCurrentMember();
  if (!member || !hasPermission(member.systemRole, "members.manage")) {
    return new Response("Forbidden", { status: 403 });
  }

  return new Response(buildTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="c360-creator-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
