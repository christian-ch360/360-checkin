import "server-only";

import { unstable_cache } from "next/cache";
import { format, startOfDay, endOfDay } from "date-fns";
import type { MemberRole, MembershipApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { formatDuration } from "@/lib/utils/format";
import { ROLE_LABELS } from "@/features/members/role-labels";
import { buildApplicationWhere } from "@/features/applications/services/applications.service";
import { formatLocation } from "@/features/applications/utils/location";
import { socialAccountLabel } from "@/lib/utils/social-links";

export const REPORT_TYPES = [
  "members",
  "commission",
  "attendance",
  "hours",
  "gmv",
  "projects",
  "applications",
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportTable = {
  title: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
};

/**
 * Only "applications" reads any of these today — every other report is a
 * full org-scoped dump with no filter support. Kept generic (raw strings,
 * not the enum types) because it's populated straight from untrusted
 * /api/reports/[type] query params; buildApplicationsReport is responsible
 * for validating each value before it reaches Prisma.
 */
export type ReportFilters = {
  status?: string;
  search?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function buildReport(organizationId: string, type: ReportType, filters?: ReportFilters): Promise<ReportTable> {
  switch (type) {
    case "members":
      return buildMembersReport(organizationId);
    case "commission":
      return buildCommissionReport(organizationId);
    case "attendance":
      return buildAttendanceReport(organizationId);
    case "hours":
      return buildHoursReport(organizationId);
    case "gmv":
      return buildGMVReport(organizationId);
    case "projects":
      return buildProjectSummaryReport(organizationId);
    case "applications":
      return buildApplicationsReport(organizationId, filters);
  }
}

async function buildMembersReport(organizationId: string): Promise<ReportTable> {
  const members = await prisma.member.findMany({
    where: { organizationId },
    orderBy: { fullName: "asc" },
    include: { commissionTier: true },
  });

  return {
    title: "Members Report",
    columns: [
      { key: "memberNumber", label: "Member #" },
      { key: "fullName", label: "Name" },
      { key: "tier", label: "Tier" },
      { key: "hoursWorked", label: "Hours worked" },
      { key: "currentCommission", label: "Current commission" },
      { key: "lifetimeCommission", label: "Lifetime commission" },
    ],
    rows: members.map((m) => ({
      memberNumber: m.memberNumber,
      fullName: m.fullName,
      tier: m.commissionTier?.code ?? "—",
      hoursWorked: Number(m.hoursWorked),
      currentCommission: Number(m.currentCommission),
      lifetimeCommission: Number(m.lifetimeCommission),
    })),
  };
}

async function buildCommissionReport(organizationId: string): Promise<ReportTable> {
  const transactions = await prisma.commissionTransaction.findMany({
    where: { member: { organizationId } },
    orderBy: { createdAt: "desc" },
    include: { member: { select: { fullName: true } }, project: { select: { name: true } } },
  });

  return {
    title: "Commission Report",
    columns: [
      { key: "date", label: "Date" },
      { key: "member", label: "Member" },
      { key: "project", label: "Project" },
      { key: "tier", label: "Tier" },
      { key: "gmv", label: "GMV" },
      { key: "commission", label: "Commission" },
      { key: "status", label: "Status" },
    ],
    rows: transactions.map((t) => ({
      date: t.createdAt.toISOString().slice(0, 10),
      member: t.member.fullName,
      project: t.project?.name ?? "—",
      tier: t.tierCode,
      gmv: Number(t.gmvAmount),
      commission: Number(t.commissionAmount),
      status: t.status,
    })),
  };
}

async function buildAttendanceReport(organizationId: string): Promise<ReportTable> {
  const checkIns = await prisma.checkIn.findMany({
    where: { member: { organizationId } },
    orderBy: { checkIn: "desc" },
    include: { member: { select: { fullName: true, memberNumber: true } } },
  });

  const DATE_FORMAT = "MMM d, yyyy h:mm a";

  return {
    title: "Attendance Report",
    columns: [
      { key: "memberId", label: "Member ID" },
      { key: "member", label: "Member" },
      { key: "checkIn", label: "Check In" },
      { key: "checkOut", label: "Check Out" },
      { key: "duration", label: "Duration" },
      { key: "status", label: "Status" },
    ],
    rows: checkIns.map((c) => ({
      memberId: c.member.memberNumber,
      member: c.member.fullName,
      checkIn: format(c.checkIn, DATE_FORMAT),
      checkOut: c.checkOut ? format(c.checkOut, DATE_FORMAT) : "—",
      duration: c.duration != null ? formatDuration(c.duration) : "—",
      status: c.status === "CHECKED_IN" ? "Checked In" : "Checked Out",
    })),
  };
}

async function buildHoursReport(organizationId: string): Promise<ReportTable> {
  const members = await prisma.member.findMany({
    where: { organizationId },
    orderBy: { hoursWorked: "desc" },
    select: { memberNumber: true, fullName: true, role: true, hoursWorked: true },
  });

  return {
    title: "Hours Worked Report",
    columns: [
      { key: "memberNumber", label: "Member #" },
      { key: "fullName", label: "Name" },
      { key: "role", label: "Role" },
      { key: "hoursWorked", label: "Total hours" },
    ],
    rows: members.map((m) => ({
      memberNumber: m.memberNumber,
      fullName: m.fullName,
      role: m.role,
      hoursWorked: Number(m.hoursWorked),
    })),
  };
}

async function buildGMVReport(organizationId: string): Promise<ReportTable> {
  const transactions = await prisma.gMVTransaction.findMany({
    where: { member: { organizationId } },
    orderBy: { transactionDate: "desc" },
    include: {
      member: { select: { fullName: true } },
      project: { select: { name: true } },
      company: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });

  return {
    title: "GMV Report",
    columns: [
      { key: "date", label: "Date" },
      { key: "member", label: "Member" },
      { key: "project", label: "Project" },
      { key: "brand", label: "Brand" },
      { key: "company", label: "Company" },
      { key: "amount", label: "Amount" },
    ],
    rows: transactions.map((t) => ({
      date: t.transactionDate.toISOString().slice(0, 10),
      member: t.member.fullName,
      project: t.project?.name ?? "—",
      brand: t.brand?.name ?? "—",
      company: t.company?.name ?? "—",
      amount: Number(t.amount),
    })),
  };
}

async function buildProjectSummaryReport(organizationId: string): Promise<ReportTable> {
  const projects = await prisma.project.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: { brand: { select: { name: true } }, _count: { select: { assignments: true } } },
  });

  return {
    title: "Project Summary Report",
    columns: [
      { key: "projectCode", label: "Project #" },
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "brand", label: "Brand" },
      { key: "teamSize", label: "Team size" },
      { key: "budget", label: "Budget" },
      { key: "gmv", label: "GMV" },
      { key: "commissionPool", label: "Commission pool" },
    ],
    rows: projects.map((p) => ({
      projectCode: p.projectCode,
      name: p.name,
      status: p.status,
      brand: p.brand?.name ?? "—",
      teamSize: p._count.assignments,
      budget: Number(p.budget),
      gmv: Number(p.gmv),
      commissionPool: Number(p.commissionPool),
    })),
  };
}

const APPLICATION_STATUS_VALUES: readonly MembershipApplicationStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const APPLICATION_ROLE_VALUES = Object.keys(ROLE_LABELS) as MemberRole[];

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

async function buildApplicationsReport(organizationId: string, filters?: ReportFilters): Promise<ReportTable> {
  const status = filters?.status && (APPLICATION_STATUS_VALUES as string[]).includes(filters.status)
    ? (filters.status as MembershipApplicationStatus)
    : undefined;
  const role = filters?.role && (APPLICATION_ROLE_VALUES as string[]).includes(filters.role)
    ? (filters.role as MemberRole)
    : undefined;

  const where = buildApplicationWhere(organizationId, { status, role, search: filters?.search });

  // "Custom Date Range" filter — applied on top of buildApplicationWhere's
  // existing status/role/search logic rather than duplicating it, since date
  // range isn't a filter any other application surface needs today.
  const fromDate = filters?.dateFrom ? new Date(filters.dateFrom) : undefined;
  const toDate = filters?.dateTo ? new Date(filters.dateTo) : undefined;
  const validFrom = fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : undefined;
  const validTo = toDate && !Number.isNaN(toDate.getTime()) ? toDate : undefined;
  if (validFrom || validTo) {
    where.createdAt = {
      ...(validFrom ? { gte: startOfDay(validFrom) } : {}),
      ...(validTo ? { lte: endOfDay(validTo) } : {}),
    };
  }

  const applications = await prisma.membershipApplication.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { reviewedBy: { select: { fullName: true } } },
  });

  const DATE_FORMAT = "MMM d, yyyy h:mm a";

  return {
    title: "Applications Report",
    columns: [
      { key: "id", label: "Application ID" },
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone Number" },
      { key: "memberType", label: "Member Type" },
      { key: "company", label: "Company" },
      { key: "instagram", label: "Instagram" },
      { key: "tiktok", label: "TikTok" },
      { key: "youtube", label: "YouTube" },
      { key: "status", label: "Application Status" },
      { key: "submittedDate", label: "Submitted Date" },
      { key: "reviewedDate", label: "Reviewed Date" },
      { key: "reviewedBy", label: "Reviewed By" },
      { key: "approvalDate", label: "Approval Date" },
      { key: "rejectionReason", label: "Rejection Reason" },
      { key: "notes", label: "Internal Notes" },
      { key: "location", label: "Location" },
      { key: "website", label: "Website" },
      { key: "businessRegistrationNumber", label: "Business Registration #" },
      { key: "referredBy", label: "Referred By" },
    ],
    // Rejection Reason and Internal Notes both read the same underlying
    // `notes` column — MembershipApplication has no dedicated rejection-
    // reason field; rejectApplicationAction persists the admin's typed
    // reason directly into `notes` (see review-actions.ts).
    rows: applications.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      email: a.email,
      phone: a.phone,
      memberType: ROLE_LABELS[a.role],
      company: a.company ?? "—",
      instagram: socialAccountLabel(a.instagram, "Instagram"),
      tiktok: socialAccountLabel(a.tiktok, "TikTok"),
      youtube: a.youtube ?? "—",
      status: titleCase(a.status),
      submittedDate: format(a.createdAt, DATE_FORMAT),
      reviewedDate: a.reviewedAt ? format(a.reviewedAt, DATE_FORMAT) : "—",
      reviewedBy: a.reviewedBy?.fullName ?? "—",
      approvalDate: a.status === "APPROVED" && a.reviewedAt ? format(a.reviewedAt, DATE_FORMAT) : "—",
      rejectionReason: a.status === "REJECTED" ? (a.notes ?? "—") : "—",
      notes: a.notes ?? "—",
      location: formatLocation(a.city, a.state, a.country) ?? "—",
      website: a.website ?? "—",
      businessRegistrationNumber: a.businessRegistrationNumber ?? "—",
      referredBy: a.referredBy ?? "—",
    })),
  };
}

/**
 * The Reports index page only ever reads `rows.length` per type to show a
 * count on each card — the actual /api/reports/[type] export route calls
 * buildReport() directly (uncached) so a downloaded payroll/commission file
 * is always computed fresh. This wrapper is cached 60s and deliberately
 * scoped to just the page's summary use, not the export path.
 */
const getCachedReportRowCounts = unstable_cache(
  async (organizationId: string) => {
    const counts = await Promise.all(
      REPORT_TYPES.map(async (type) => {
        const table = await buildReport(organizationId, type);
        return [type, table.rows.length] as const;
      })
    );
    return Object.fromEntries(counts) as Record<ReportType, number>;
  },
  ["report-row-counts"],
  { revalidate: 60 }
);

export async function getCachedReportSummary(organizationId: string) {
  return getCachedReportRowCounts(organizationId);
}
