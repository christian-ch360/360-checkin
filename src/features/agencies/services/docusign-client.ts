import "server-only";

import { createSign } from "node:crypto";

/**
 * DocuSign JWT Grant client — no `jsonwebtoken` dependency needed, since a
 * JWT Grant assertion is just base64url(header).base64url(payload) signed
 * with RS256, which Node's built-in `crypto` does directly.
 *
 * Fully optional: every export here throws/returns null gracefully when the
 * five DOCUSIGN_* env vars aren't set, matching the same best-effort-null
 * convention as getSupabaseAdmin() — Contracts' manual upload/version/status
 * workflow works today without any of this configured.
 */

export type DocuSignConfig = {
  integrationKey: string;
  userId: string;
  accountId: string;
  privateKey: string;
  baseUri: string;
};

export function getDocuSignConfig(): DocuSignConfig | null {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
  const userId = process.env.DOCUSIGN_USER_ID;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;
  const baseUri = process.env.DOCUSIGN_BASE_URI;
  if (!integrationKey || !userId || !accountId || !privateKey || !baseUri) return null;

  return { integrationKey, userId, accountId, privateKey: privateKey.replace(/\\n/g, "\n"), baseUri };
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** OAuth host is always the *-account-* domain, distinct from the eSignature API's baseUri. */
function accountAuthHost(baseUri: string): string {
  return baseUri.includes("demo.docusign.net") ? "account-d.docusign.com" : "account.docusign.com";
}

function buildJwtAssertion(config: DocuSignConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: config.integrationKey,
    sub: config.userId,
    aud: accountAuthHost(config.baseUri),
    iat: now,
    exp: now + 3600,
    scope: "signature impersonation",
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(config.privateKey);
  return `${signingInput}.${base64url(signature)}`;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string | null> {
  const config = getDocuSignConfig();
  if (!config) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.accessToken;

  const assertion = buildJwtAssertion(config);
  const res = await fetch(`https://${accountAuthHost(config.baseUri)}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) {
    console.error("DocuSign auth failed", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { accessToken: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.accessToken;
}

export type CreateEnvelopeInput = {
  fileUrl: string;
  fileName: string;
  emailSubject: string;
  recipientEmail: string;
  recipientName: string;
};

/** Sends a PDF (fetched from its Storage URL) as an envelope with a single signer. */
export async function createEnvelope(input: CreateEnvelopeInput): Promise<{ envelopeId: string } | { error: string }> {
  const config = getDocuSignConfig();
  const token = await getAccessToken();
  if (!config || !token) return { error: "DocuSign isn't configured yet." };

  const fileRes = await fetch(input.fileUrl);
  if (!fileRes.ok) return { error: "Couldn't fetch the contract file to send." };
  const documentBase64 = Buffer.from(await fileRes.arrayBuffer()).toString("base64");

  const res = await fetch(`${config.baseUri}/v2.1/accounts/${config.accountId}/envelopes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      emailSubject: input.emailSubject,
      documents: [{ documentBase64, name: input.fileName, fileExtension: "pdf", documentId: "1" }],
      recipients: {
        signers: [
          {
            email: input.recipientEmail,
            name: input.recipientName,
            recipientId: "1",
            routingOrder: "1",
            tabs: { signHereTabs: [{ anchorString: "/sig/", anchorUnits: "pixels", anchorXOffset: "0", anchorYOffset: "0" }] },
          },
        ],
      },
      status: "sent",
    }),
  });

  if (!res.ok) {
    console.error("DocuSign createEnvelope failed", res.status, await res.text().catch(() => ""));
    return { error: "DocuSign rejected the request. Check the document has a signature anchor." };
  }

  const data = (await res.json()) as { envelopeId: string };
  return { envelopeId: data.envelopeId };
}

export async function getEnvelopeStatus(envelopeId: string): Promise<{ status: string } | { error: string }> {
  const config = getDocuSignConfig();
  const token = await getAccessToken();
  if (!config || !token) return { error: "DocuSign isn't configured yet." };

  const res = await fetch(`${config.baseUri}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { error: "Couldn't reach DocuSign for this envelope's status." };

  const data = (await res.json()) as { status: string };
  return { status: data.status };
}
