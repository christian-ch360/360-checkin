"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireCurrentMember } from "@/features/auth/services/current-member";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";
import { effectiveAgencyIdFor } from "@/features/agencies/services/agency-crm-shared";
import { canManageInvoices } from "@/features/agencies/config/agency-permissions";
import { nextInvoiceNumber } from "@/features/agencies/services/invoice.service";

export type InvoiceActionResult = { success: true; invoiceId?: string } | { success: false; error: string };

const invoiceSchema = z.object({
  campaignId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().trim().max(1000).optional(),
});

async function requireInvoiceManager() {
  const actor = await requireCurrentMember();
  const agencyId = effectiveAgencyIdFor(actor);
  if (!canManageInvoices(actor.agencyRole)) {
    return { actor, agencyId, allowed: false as const, error: "You don't have permission to manage invoices." };
  }
  return { actor, agencyId, allowed: true as const };
}

export async function createInvoice(input: z.infer<typeof invoiceSchema>): Promise<InvoiceActionResult> {
  const check = await requireInvoiceManager();
  if (!check.allowed) return { success: false, error: check.error };

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const invoiceNumber = await nextInvoiceNumber(check.agencyId);

  const invoice = await prisma.invoice.create({
    data: {
      organizationId: check.actor.organizationId,
      agencyId: check.agencyId,
      campaignId: parsed.data.campaignId || null,
      brandId: parsed.data.brandId || null,
      invoiceNumber,
      amount: parsed.data.amount,
      dueDate: new Date(parsed.data.dueDate),
      notes: parsed.data.notes || null,
      createdById: check.actor.id,
    },
  });

  revalidatePath("/agency");
  return { success: true, invoiceId: invoice.id };
}

export async function markInvoiceSent(invoiceId: string): Promise<InvoiceActionResult> {
  const check = await requireInvoiceManager();
  if (!check.allowed) return { success: false, error: check.error };

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!invoice) return { success: false, error: "Invoice not found." };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "SENT" } });
  revalidatePath("/agency");
  return { success: true, invoiceId };
}

export async function markInvoicePaid(invoiceId: string): Promise<InvoiceActionResult> {
  const check = await requireInvoiceManager();
  if (!check.allowed) return { success: false, error: check.error };

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!invoice) return { success: false, error: "Invoice not found." };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "PAID", paidAt: new Date() } });

  await logAgencyActivity({
    organizationId: check.actor.organizationId,
    agencyId: check.agencyId,
    type: "INVOICE_PAID",
    actorId: check.actor.id,
    message: `Invoice ${invoice.invoiceNumber} was marked paid`,
  });

  revalidatePath("/agency");
  return { success: true, invoiceId };
}

export async function cancelInvoice(invoiceId: string): Promise<InvoiceActionResult> {
  const check = await requireInvoiceManager();
  if (!check.allowed) return { success: false, error: check.error };

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId: check.actor.organizationId, agencyId: check.agencyId } });
  if (!invoice) return { success: false, error: "Invoice not found." };

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELLED" } });
  revalidatePath("/agency");
  return { success: true, invoiceId };
}
