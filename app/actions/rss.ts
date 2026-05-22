'use server';

import { getSession } from '@/lib/auth';
import { runAutomation } from '@/lib/automation';
import { createPost, createMultiPhotoPost, uploadPhoto } from '@/lib/facebook';
import { generateFbPost } from '@/lib/openai-post';
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
    const [items, history] = await Promise.all([fetchRssItems(), readHistory()]);
    const postedIds = new Set(history.filter((h) => h.status === 'posted').map((h) => h.id));
    return {
      ok: true as const,
      items: items.slice(0, 10).map((i) => ({ ...i, posted: postedIds.has(i.id) })),
    };
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : String(err), items: [] };
  }
}

export async function postRssItemAction(item: {
  id: string;
  title: string;
  link: string;
  description: string;
  image?: string;
  images?: string[];
}) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  if (await isPosted(item.id)) return { ok: false, error: 'Already posted' };
  try {
    const cfg = await readConfig();
    const message = await generateFbPost(item);
    const imgs = cfg.includeImage ? (item.images ?? (item.image ? [item.image] : [])) : [];

    let result: { id: string };
    if (imgs.length > 0) {
      const uploaded = await Promise.all(imgs.slice(0, 5).map((url) => uploadPhoto(url)));
      result = await createMultiPhotoPost({ message, photoIds: uploaded.map((p) => p.id), link: item.link || undefined });
    } else {
      result = await createPost({ message, link: item.link || undefined });
    }

    await appendHistory({ id: item.id, title: item.title, fbPostId: result.id, status: 'posted', timestamp: new Date().toISOString() });
    return { ok: true, postId: result.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveRssConfig(cfg: Partial<RssConfig>) {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const current = await readConfig();
    await writeConfig({ ...current, ...cfg });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
