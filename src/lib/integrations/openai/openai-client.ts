import "server-only";

/**
 * Low-level OpenAI REST client — plain `fetch()`, no SDK dependency, same
 * convention as `modash-client.ts` / this codebase's DocuSign client.
 * OPENAI_API_KEY is never read anywhere outside this file and never sent to
 * the browser.
 */

const OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o-mini";

export type OpenAIConfig = { apiKey: string; baseUrl: string; model: string };

export function getOpenAIConfig(): OpenAIConfig | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return { apiKey, baseUrl: OPENAI_BASE_URL, model: process.env.OPENAI_MODEL || DEFAULT_MODEL };
}

export function isOpenAIConfigured(): boolean {
  return getOpenAIConfig() !== null;
}

/**
 * Chat Completions with Structured Outputs (`response_format: json_schema`,
 * `strict: true`) — OpenAI guarantees the response matches `schema`, so
 * callers get a parsed JS value directly rather than free-form text to
 * regex/JSON.parse defensively. See `campaign-intelligence.service.ts` for
 * the schema used for creator-candidate analysis.
 */
export async function createStructuredCompletion<T>(input: {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const config = getOpenAIConfig();
  if (!config) return { ok: false, error: "OpenAI is not configured — set OPENAI_API_KEY to enable campaign intelligence." };

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: input.schemaName, strict: true, schema: input.schema },
        },
      }),
    });

    if (!response.ok) {
      return { ok: false, error: `OpenAI request failed (${response.status}).` };
    }

    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { ok: false, error: "OpenAI returned an empty response." };

    return { ok: true, data: JSON.parse(content) as T };
  } catch {
    return { ok: false, error: "OpenAI request failed." };
  }
}
