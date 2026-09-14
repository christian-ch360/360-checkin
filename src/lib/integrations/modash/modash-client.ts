import "server-only";

/**
 * Low-level Modash REST client. Server-only, credential-gated — mirrors the
 * `getDocuSignConfig()` / `stripe` pattern used elsewhere in this codebase:
 * a `get*Config()` that returns `null` (never throws) when the API key is
 * absent, so every caller degrades gracefully instead of crashing.
 *
 * MODASH_API_KEY is never read anywhere outside this file and never sent to
 * the browser — see `isModashConfigured()` for the only thing UI code is
 * allowed to know about its presence.
 */

const MODASH_BASE_URL = "https://api.modash.io/v1";

export type ModashConfig = { apiKey: string; baseUrl: string };

export function getModashConfig(): ModashConfig | null {
  const apiKey = process.env.MODASH_API_KEY;
  if (!apiKey) return null;
  return { apiKey, baseUrl: MODASH_BASE_URL };
}

export function isModashConfigured(): boolean {
  return getModashConfig() !== null;
}

/**
 * Thin authenticated fetch wrapper. Not exported outside this module — every
 * real Modash call goes through `modash.service.ts`, which is what the rest
 * of the app imports. Kept as a plain `fetch()` call (no SDK dependency),
 * matching this codebase's DocuSign client.
 */
export async function modashRequest<T>(
  path: string,
  init?: { method?: "GET" | "POST"; query?: Record<string, string | number | undefined>; body?: unknown },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const config = getModashConfig();
  if (!config) return { ok: false, error: "Modash is not configured — set MODASH_API_KEY to enable creator discovery." };

  const url = new URL(`${config.baseUrl}${path}`);
  for (const [key, value] of Object.entries(init?.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url.toString(), {
      method: init?.method ?? "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      return { ok: false, error: `Modash request failed (${response.status}).` };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Modash request failed." };
  }
}
