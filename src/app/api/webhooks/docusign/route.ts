import { NextResponse } from "next/server";
import { handleDocuSignWebhookEvent, verifyDocuSignWebhookSignature } from "@/features/agencies/services/docusign-actions";

/** DocuSign Connect posts here on every envelope status change (sent/delivered/completed/declined/voided). */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-docusign-signature-1");

  if (!verifyDocuSignWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  await handleDocuSignWebhookEvent(payload);

  return NextResponse.json({ received: true });
}
