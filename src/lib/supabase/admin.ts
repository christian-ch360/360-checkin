import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PLACEHOLDER_KEY = "your-service-role-key";

let client: SupabaseClient | null | undefined;

/**
 * Returns null (not a throwing client) when SUPABASE_SERVICE_ROLE_KEY isn't
 * configured — every env file in this repo ships it as the literal
 * placeholder "your-service-role-key". Same graceful-degradation shape as
 * getEmailClient(): callers must treat automatic account creation as
 * best-effort and fall back to today's manual behavior, never block on it.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (client !== undefined) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || serviceRoleKey === PLACEHOLDER_KEY) {
    client = null;
    return client;
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}
