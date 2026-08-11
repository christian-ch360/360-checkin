import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { logAgencyActivity } from "@/features/agencies/services/agency-activity.service";
import { notifyAgencyAdmins } from "@/features/agencies/services/agency-access.service";
import { createEnvelope, getEnvelopeStatus as fetchEnvelopeStatus, getDocuSignConfig } from "@/features/agencies/services/docusign-client";

export type DocuSignActionResult = { success: true } | { success: false; error: string };

/** Sends a Contract's current file to DocuSign for signature — sets status SENT + docusignEnvelopeId, or a clear "not configured" error if the env vars aren't set. */
export async function sendContractForSignature(
  contractId: string,
  recipientEmail: string,
  recipientName: string
): Promise<DocuSignActionResult> {
  if (!getDocuSignConfig()) {
    return { success: false, error: "E-signature isn't configured yet. Ask an admin to set the DOCUSIGN_* environment variables." };
  }

  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return { success: false, error: "Contract not found." };

  const result = await createEnvelope({
    fileUrl: contract.fileUrl,
    fileName: contract.fileName,
    emailSubject: `Please sign: ${contract.title}`,
    recipientEmail,
    recipientName,
  });
  if ("error" in result) return { success: false, error: result.error };

  await prisma.contract.update({
    where: { id: contractId },
    data: { status: "SENT", docusignEnvelopeId: result.envelopeId, sentAt: new Date() },
  });

  await logAgencyActivity({
    organizationId: contract.organizationId,
    agencyId: contract.agencyId,
    type: "CONTRACT_SENT",
    message: `"${contract.title}" was sent for signature via DocuSign`,
  });

  return { success: true };
}

/** Polling fallback for environments without DocuSign Connect webhooks configured. */
export async function refreshContractEnvelopeStatus(contractId: string): Promise<DocuSignActionResult> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return { success: false, error: "Contract not found." };
  if (!contract.docusignEnvelopeId) return { success: false, error: "This contract hasn't been sent for signature." };

  const result = await fetchEnvelopeStatus(contract.docusignEnvelopeId);
  if ("error" in result) return { success: false, error: result.error };

  await applyEnvelopeStatus(contract.id, result.status);
  return { success: true };
}

/** Shared by the polling fallback and the webhook handler — maps DocuSign's envelope status onto ContractStatus. */
async function applyEnvelopeStatus(contractId: string, docusignStatus: string): Promise<void> {
  const normalized = docusignStatus.toLowerCase();
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return;

  if (normalized === "completed" && contract.status !== "SIGNED") {
    await prisma.contract.update({ where: { id: contractId }, data: { status: "SIGNED", signedAt: new Date() } });
    await logAgencyActivity({
      organizationId: contract.organizationId,
      agencyId: contract.agencyId,
      type: "CONTRACT_SIGNED",
      message: `"${contract.title}" was signed`,
    });
    await notifyAgencyAdmins(contract.organizationId, contract.agencyId, {
      type: "CONTRACT_SIGNED",
      title: `"${contract.title}" was signed`,
      body: "The contract has been fully executed via DocuSign.",
    });
  } else if (normalized === "declined" && contract.status !== "DECLINED") {
    await prisma.contract.update({ where: { id: contractId }, data: { status: "DECLINED" } });
  } else if (normalized === "voided" && contract.status !== "CANCELLED") {
    await prisma.contract.update({ where: { id: contractId }, data: { status: "CANCELLED" } });
  }
}

export type DocuSignWebhookPayload = {
  event: string;
  data?: { envelopeId?: string; envelopeSummary?: { status?: string } };
};

/** DocuSign Connect posts here on every envelope status change — looked up by envelopeId, not a fixed contractId. */
export async function handleDocuSignWebhookEvent(payload: DocuSignWebhookPayload): Promise<void> {
  const envelopeId = payload.data?.envelopeId;
  const status = payload.data?.envelopeSummary?.status;
  if (!envelopeId || !status) return;

  const contract = await prisma.contract.findFirst({ where: { docusignEnvelopeId: envelopeId } });
  if (!contract) return;

  await applyEnvelopeStatus(contract.id, status);
}

/** Verifies DocuSign Connect's HMAC signature header before trusting a webhook payload. */
export function verifyDocuSignWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.DOCUSIGN_WEBHOOK_HMAC_KEY;
  if (!secret || !signatureHeader) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}
