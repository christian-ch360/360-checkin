import "server-only";

import { prisma } from "@/lib/db/prisma";
import { syncConnection } from "@/features/integrations/services/social-connections.service";
import { syncStoreConnection } from "@/features/integrations/services/store-connections.service";

type SyncSummary = { synced: number; errored: number };

/**
 * Runs on a schedule (see vercel.json's cron entry, gated by the
 * /api/cron/sync-integrations route) — syncs every CONNECTED social and
 * store connection. Reuses the exact same syncConnection/syncStoreConnection
 * functions the manual "Sync Now" button calls, so there's only one place
 * that knows how to update a connection row. One failing row never aborts
 * the batch (Promise.allSettled), matching the per-row error handling those
 * sync functions already have (status flips to ERROR, lastSyncError set).
 */
export async function runScheduledSync(): Promise<{ social: SyncSummary; store: SyncSummary }> {
  const [socialConnections, storeConnections] = await Promise.all([
    prisma.socialConnection.findMany({ where: { status: "CONNECTED" }, select: { memberId: true, platform: true } }),
    prisma.storeConnection.findMany({ where: { status: "CONNECTED" }, select: { memberId: true, provider: true } }),
  ]);

  const socialResults = await Promise.allSettled(
    socialConnections.map((c) => syncConnection(c.memberId, c.platform))
  );
  const storeResults = await Promise.allSettled(
    storeConnections.map((c) => syncStoreConnection(c.memberId, c.provider))
  );

  const summarize = (results: PromiseSettledResult<unknown>[]): SyncSummary => ({
    synced: results.filter((r) => r.status === "fulfilled").length,
    errored: results.filter((r) => r.status === "rejected").length,
  });

  return { social: summarize(socialResults), store: summarize(storeResults) };
}
