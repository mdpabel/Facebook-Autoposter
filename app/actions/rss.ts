'use server';

import { getSession } from '@/lib/auth';
import { runAutomation } from '@/lib/automation';
import { createPost } from '@/lib/facebook';
import { fetchRssItems } from '@/lib/rss';
import { appendHistory, isPosted, readHistory } from '@/lib/rss-history';
import { readConfig, writeConfig, type RssConfig } from '@/lib/rss-config';

export async function runAutomationAction() {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const summary = await runAutomation();
    return { ok: true, summary };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function fetchFeedAction() {
  const session = await getSession();
  if (!session) return { ok: false as const, error: 'Unauthorized', items: [] };
  try {
    const items = await fetchRssItems();
    const history = readHistory();
    const postedIds = new Set(history.filter((h) => h.status === 'posted').map((h) => h.id));
    return { ok: true as const, items: items.slice(0, 10).map((i) => ({ ...i, posted: postedIds.has(i.id) })) };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err), items: [] };
  }
}

export async function postRssItemAction(item: { id: string; title: string; link: string; description: string; image?: string }) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  if (isPosted(item.id)) return { ok: false, error: 'Already posted' };
  try {
    const cfg = readConfig();
    const message = cfg.template
      .replace('{title}', item.title)
      .replace('{link}', item.link)
      .replace('{description}', item.description);
    const result = await createPost({ message, imageUrl: cfg.includeImage ? item.image : undefined });
    appendHistory({ id: item.id, title: item.title, fbPostId: result.id, status: 'posted', timestamp: new Date().toISOString() });
    return { ok: true, postId: result.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveRssConfig(cfg: Partial<RssConfig>) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const current = readConfig();
    writeConfig({ ...current, ...cfg });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
