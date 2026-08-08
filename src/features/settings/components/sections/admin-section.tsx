import Link from "next/link";
import { Users, FolderKanban, Percent, DoorOpen, MonitorSmartphone, Building2, ScrollText, Mail, FileText, ArrowRight, CreditCard, Scale, Palette, PartyPopper, ShieldAlert, FileSpreadsheet } from "lucide-react";
import { SettingsSectionCard } from "@/features/settings/components/settings-section-card";

const LINKS = [
  { href: "/admin/applications", label: "Applications", description: "Review and approve membership applications.", icon: FileText },
  { href: "/members", label: "Member Management", description: "View and manage every member.", icon: Users },
  { href: "/projects", label: "Project Management", description: "Projects, assignments, and tasks.", icon: FolderKanban },
  { href: "/admin/events", label: "Event Manager", description: "Approve proposals, feature events, and track attendance.", icon: PartyPopper },
  { href: "/commissions", label: "Commission Settings", description: "Tiers, transactions, and payouts.", icon: Percent },
  { href: "/reports", label: "Reports", description: "Export members, attendance, GMV, commissions, and more.", icon: FileSpreadsheet },
  { href: "/admin/membership-plans", label: "Membership Plans", description: "Manage plans, pricing, and benefits.", icon: CreditCard },
  { href: "/admin/membership-management", label: "Membership Management", description: "Search, filter, and override member billing status.", icon: CreditCard },
  { href: "/admin/legal", label: "Legal", description: "Manage legal documents, versions, and compliance.", icon: Scale },
  { href: "/spaces", label: "Space Management", description: "Rooms, studios, and bookings.", icon: DoorOpen },
  { href: "/kiosk/admin", label: "Kiosk Management", description: "Occupancy, check-ins, and visitors.", icon: MonitorSmartphone },
  { href: "/admin", label: "Organization Settings", description: "Invitations, permissions, and org details.", icon: Building2 },
  { href: "/admin/audit-logs", label: "Audit Logs", description: "Every recorded administrative action.", icon: ScrollText },
  { href: "/admin/communications", label: "Communications", description: "Send emails and review delivery history.", icon: Mail },
];

/** "Add a dedicated Kiosk Manager to the Super Admin Dashboard ... Only Super Admins can
 * access this page." Shown only when `kiosk.manage` is held — never granted to plain ADMIN
 * (see lib/permissions/index.ts) — same "Admin quick-links, gated per-item" pattern as the
 * rest of this section, not a blanket admin.access gate. */
export function AdminSection({
  canManageKiosk = false,
  canOverrideAgencyAccess = false,
}: {
  canManageKiosk?: boolean;
  canOverrideAgencyAccess?: boolean;
}) {
  let links = canManageKiosk
    ? [...LINKS, { href: "/admin/kiosk-manager", label: "Kiosk Manager", description: "Dynamic kiosk themes, homepage layout, and analytics.", icon: Palette }]
    : LINKS;
  if (canOverrideAgencyAccess) {
    links = [
      ...links,
      {
        href: "/admin/agency-override",
        label: "Agency Access Override",
        description: "Manually attach a member to an agency, bypassing the request/approval flow.",
        icon: ShieldAlert,
      },
    ];
  }

  return (
    <SettingsSectionCard id="admin" title="Admin" description="Quick access to management tools — nothing here is duplicated, just linked.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <link.icon className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-medium">
                {link.label}
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </SettingsSectionCard>
  );
}
