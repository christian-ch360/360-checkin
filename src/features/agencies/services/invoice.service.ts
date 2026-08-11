import "server-only";

import { prisma } from "@/lib/db/prisma";

const INVOICE_INCLUDE = {
  brand: { select: { id: true, name: true } },
  campaign: { select: { id: true, title: true } },
  createdBy: { select: { id: true, fullName: true } },
} as const;

export async function listInvoices(organizationId: string, agencyId: string) {
  return prisma.invoice.findMany({
    where: { organizationId, agencyId },
    include: INVOICE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export type InvoiceListItem = Awaited<ReturnType<typeof listInvoices>>[number];

export async function getInvoice(organizationId: string, invoiceId: string) {
  return prisma.invoice.findFirst({ where: { id: invoiceId, organizationId }, include: INVOICE_INCLUDE });
}

export async function nextInvoiceNumber(agencyId: string): Promise<string> {
  const count = await prisma.invoice.count({ where: { agencyId } });
  return `INV-${String(count + 1).padStart(5, "0")}`;
}

/** For the Agency Dashboard's Revenue section. */
export async function getInvoiceSummary(organizationId: string, agencyId: string) {
  const [paid, outstanding] = await Promise.all([
    prisma.invoice.aggregate({ where: { organizationId, agencyId, status: "PAID" }, _sum: { amount: true } }),
    prisma.invoice.aggregate({
      where: { organizationId, agencyId, status: { in: ["SENT", "OVERDUE"] } },
      _sum: { amount: true },
    }),
  ]);
  return {
    paidTotal: Number(paid._sum.amount ?? 0),
    outstandingTotal: Number(outstanding._sum.amount ?? 0),
  };
}
