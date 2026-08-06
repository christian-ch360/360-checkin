import "server-only";

import { prisma } from "@/lib/db/prisma";
import { syncConnection } from "@/features/integrations/services/social-connections.service";
import { syncStoreConnection } from "@/features/integrations/services/store-connections.service";
import { mapWithConcurrency } from "@/lib/utils/batch";

type SyncSummary = { synced: number; errored: number };

// Batching, not just "sync everything at once": each Instagram/TikTok/
// Shopify app has its own per-app rate limit, and this only ever queries
// rows already filtered to status: "CONNECTED" — never every member, only
// the ones with a live connection to actually sync. 5 concurrent requests
// per provider with a short pause between batches keeps a large connected
// roster well under any realistic hourly limit while still finishing the
// whole sweep in well under a minute for this org's member count.
const SYNC_BATCH_SIZE = 5;
const SYNC_BATCH_DELAY_MS = 500;

/**
 * Runs on a schedule (see vercel.json's cron entry, gated by the
 * /api/cron/sync-integrations route) — syncs every CONNECTED social and
 * store connection. Reuses the exact same syncConnection/syncStoreConnection
 * functions the manual "Sync Now" button calls, so there's only one place
 * that knows how to update a connection row. One failing row never aborts
 * the batch, matching the per-row error handling those sync functions
 * already have (status flips to ERROR, lastSyncError set, previous
 * follower/etc. values untouched). syncConnection()'s own atomic claim
 * means a connection mid-sync from a member's manual "Sync Now" click is
 * safely skipped here rather than double-synced.
 */
export async function runScheduledSync(): Promise<{ social: SyncSummary; store: SyncSummary }> {
  const [socialConnections, storeConnections] = await Promise.all([
    prisma.socialConnection.findMany({ where: { status: "CONNECTED" }, select: { memberId: true, platform: true } }),
    prisma.storeConnection.findMany({ where: { status: "CONNECTED" }, select: { memberId: true, provider: true } }),
  ]);

  const socialResults = await mapWithConcurrency(
    socialConnections,
    SYNC_BATCH_SIZE,
    (c) => syncConnection(c.memberId, c.platform),
    SYNC_BATCH_DELAY_MS
  );
  const storeResults = await mapWithConcurrency(
    storeConnections,
    SYNC_BATCH_SIZE,
    (c) => syncStoreConnection(c.memberId, c.provider),
    SYNC_BATCH_DELAY_MS
  );

  const summarize = (results: PromiseSettledResult<unknown>[]): SyncSummary => ({
    synced: results.filter((r) => r.status === "fulfilled").length,
    errored: results.filter((r) => r.status === "rejected").length,
  });

  return { social: summarize(socialResults), store: summarize(storeResults) };
}
