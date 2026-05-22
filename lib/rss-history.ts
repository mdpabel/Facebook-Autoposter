import redis from './redis';

export type HistoryEntry = {
  id: string;
  title: string;
  fbPostId?: string;
  status: 'posted' | 'skipped' | 'failed';
  timestamp: string;
};

const HISTORY_KEY = 'rss:history';
const POSTED_KEY = 'rss:posted';

export async function readHistory(): Promise<HistoryEntry[]> {
  const raw = await redis.get<HistoryEntry[]>(HISTORY_KEY);
  return raw ?? [];
}

export async function appendHistory(entry: HistoryEntry): Promise<void> {
  const history = await readHistory();
  history.unshift(entry);
  await redis.set(HISTORY_KEY, history.slice(0, 200));
  if (entry.status === 'posted') {
    await redis.sadd(POSTED_KEY, entry.id);
  }
}

export async function isPosted(id: string): Promise<boolean> {
  const member = await redis.sismember(POSTED_KEY, id);
  return member === 1;
}
