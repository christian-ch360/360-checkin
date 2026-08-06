/**
 * Runs `fn` over `items` in fixed-size concurrent chunks rather than firing
 * every call at once — the batching primitive behind the daily social/store
 * sync sweep (scheduled-sync.service.ts), so a large connected-member roster
 * can't burst past a provider's per-app rate limit. One item failing never
 * aborts the batch or the items after it (Promise.allSettled per chunk).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  delayBetweenBatchesMs = 0
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
    if (delayBetweenBatchesMs > 0 && i + concurrency < items.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatchesMs));
    }
  }
  return results;
}
