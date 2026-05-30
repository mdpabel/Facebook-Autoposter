import redis from './redis';
import { postToBluesky } from './bluesky';

export type BlueskyJob = {
  caption: string;
  link: string;
  imageUrl?: string;
  alt?: string;
  publishAt: number; // unix seconds — when this post is due
  attempts?: number;
};

const KEY = 'bluesky:queue';
const MAX_ATTEMPTS = 3;

export async function enqueueBluesky(job: BlueskyJob): Promise<void> {
  const q = (await redis.get<BlueskyJob[]>(KEY)) ?? [];
  q.push(job);
  await redis.set(KEY, q);
}

/**
 * Bluesky has no native scheduling, so we hold posts in Redis and publish the ones
 * that are due (publishAt <= now). Called from the hourly cron. Failed jobs are
 * retried up to MAX_ATTEMPTS, then dropped.
 */
export async function drainBlueskyQueue(): Promise<{ posted: number; failed: number; pending: number }> {
  const q = (await redis.get<BlueskyJob[]>(KEY)) ?? [];
  if (q.length === 0) return { posted: 0, failed: 0, pending: 0 };

  const now = Math.floor(Date.now() / 1000);
  const remaining: BlueskyJob[] = [];
  let posted = 0;
  let failed = 0;

  for (const job of q) {
    if (job.publishAt > now) {
      remaining.push(job);
      continue;
    }
    try {
      await postToBluesky(job);
      posted++;
    } catch {
      const attempts = (job.attempts ?? 0) + 1;
      if (attempts < MAX_ATTEMPTS) remaining.push({ ...job, attempts });
      failed++;
    }
  }

  await redis.set(KEY, remaining);
  return { posted, failed, pending: remaining.length };
}
