import type { LucideIcon } from "lucide-react";
import type { MemberRole } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  DoorOpen,
  QrCode,
  MessageSquare,
  BarChart3,
  FileCheck2,
  Settings,
  CircleUserRound,
  Inbox,
  FileStack,
  Scale,
  Megaphone,
  Palette,
  FileSpreadsheet,
  Sparkles,
  Share2,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";
import type { AccentName } from "@/config/nav-colors";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  accent: AccentName;
  permission?: Permission;
  /** Restricts this item to specific MemberRoles (e.g. the Agency Dashboard
   * link) — independent of `permission`, which only gates by SystemRole. */
  memberRoles?: MemberRole[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
  /** Gates the ENTIRE section regardless of each item's own `permission`.
   * Needed because several existing item permissions (e.g. `members.view`,
   * `reports.view`) are also held by non-admin SystemRoles (MANAGER,
   * PROJECT_LEADER) for unrelated reasons — item-level filtering alone can't
   * reliably hide an admin-only section. Mirrors the same `admin.access`
   * check this file used to apply by rendering two separate arrays. */
  requiredPermission?: Permission;
};

// One navbar, two sections: MAIN (everyone) and ADMIN (admin.access holders
// only — ADMIN and SUPER_ADMIN). Historically these were two independent
// hand-curated arrays selected by role; consolidated into one list with an
// explicit section-level gate so the ADMIN divider is a single visible label
// rather than four separate sub-sections. Neither section deletes any route:
// pages not listed here (Brands, Companies, Events, Feedback, GMV,
// Commissions, Pending Members, /admin) stay fully reachable by URL, from
// within the pages above, and via the command palette (⌘K) — only the
// primary sidebar listing is scoped down.

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: "blue" },
      { title: "Spaces", href: "/spaces", icon: DoorOpen, accent: "cyan" },
      { title: "Messages", href: "/messages", icon: MessageSquare, accent: "purple" },
      { title: "Community", href: "/community", icon: Sparkles, accent: "violet" },
      { title: "Projects", href: "/projects", icon: FolderKanban, accent: "indigo", permission: "projects.view" },
      { title: "Agency", href: "/agency", icon: Megaphone, accent: "amber", memberRoles: ["AGENCY", "BRAND"] },
      { title: "Profile", href: "/profile", icon: CircleUserRound, accent: "gray" },
    ],
  },
  {
    title: "Admin",
    requiredPermission: "admin.access",
    items: [
      { title: "Members", href: "/members", icon: Users, accent: "blue", permission: "members.view" },
      { title: "Applications", href: "/admin/applications", icon: FileCheck2, accent: "amber", permission: "members.approve" },
      { title: "Referrals", href: "/admin/referrals", icon: Share2, accent: "indigo", permission: "referrals.view" },
      { title: "Operations", href: "/check-in", icon: QrCode, accent: "emerald", permission: "checkin.manage" },
      { title: "Analytics", href: "/analytics", icon: BarChart3, accent: "emerald", permission: "reports.view" },
      { title: "Reports", href: "/reports", icon: FileSpreadsheet, accent: "teal", permission: "reports.view" },
      { title: "Settings", href: "/settings", icon: Settings, accent: "gray" },
      { title: "Email Center", href: "/admin/email-center", icon: Inbox, accent: "cyan", permission: "admin.access" },
      {
        title: "Email Templates",
        href: "/admin/email-templates",
        icon: FileStack,
        accent: "indigo",
        permission: "admin.access",
      },
      { title: "Legal", href: "/admin/legal", icon: Scale, accent: "slate", permission: "legal.manage" },
      {
        title: "Kiosk Themes",
        href: "/admin/kiosk-manager?tab=themes",
        icon: Palette,
        accent: "violet",
        permission: "kiosk.manage",
      },
    ],
  },
];
