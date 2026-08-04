import type { LucideIcon } from "lucide-react";
import type { MemberRole } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  DoorOpen,
  QrCode,
  Handshake,
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
};

// CreatorHub360 renders two intentionally different navigations depending on
// role (see src/app/(dashboard)/layout.tsx) rather than one shared list
// filtered permission-by-permission — creators get a workspace focused on
// booking/collaborating/messaging, admins get an operations-focused one.
// Neither list deletes any route: pages not listed here (Brands, Companies,
// Events, Feedback, GMV, Commissions, Reports, Pending Members, /admin) stay
// fully reachable by URL, from within the pages above, and via the command
// palette (⌘K) — only the primary sidebar listing is scoped down.

export const CREATOR_NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: "blue" },
      { title: "Spaces", href: "/spaces", icon: DoorOpen, accent: "cyan" },
      { title: "Messages", href: "/messages", icon: MessageSquare, accent: "purple" },
      { title: "Community", href: "/collab-hub", icon: Handshake, accent: "violet" },
      { title: "Projects", href: "/projects", icon: FolderKanban, accent: "indigo", permission: "projects.view" },
      { title: "Agency", href: "/agency", icon: Megaphone, accent: "amber", memberRoles: ["AGENCY"] },
      { title: "Profile", href: "/profile", icon: CircleUserRound, accent: "gray" },
    ],
  },
];

export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, accent: "blue" },
      { title: "Members", href: "/members", icon: Users, accent: "blue", permission: "members.view" },
      { title: "Community", href: "/collab-hub", icon: Handshake, accent: "violet" },
      { title: "Applications", href: "/admin/applications", icon: FileCheck2, accent: "amber", permission: "members.approve" },
      { title: "Operations", href: "/check-in", icon: QrCode, accent: "emerald", permission: "checkin.manage" },
      { title: "Analytics", href: "/analytics", icon: BarChart3, accent: "emerald", permission: "reports.view" },
      { title: "Profile", href: "/profile", icon: CircleUserRound, accent: "gray" },
      { title: "Settings", href: "/settings", icon: Settings, accent: "gray" },
    ],
  },
  {
    title: "Communications",
    items: [
      { title: "Email Center", href: "/admin/email-center", icon: Inbox, accent: "cyan", permission: "admin.access" },
      {
        title: "Email Templates",
        href: "/admin/email-templates",
        icon: FileStack,
        accent: "indigo",
        permission: "admin.access",
      },
    ],
  },
  {
    title: "Legal",
    items: [{ title: "Legal", href: "/admin/legal", icon: Scale, accent: "slate", permission: "legal.manage" }],
  },
  {
    title: "Operations",
    items: [
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
