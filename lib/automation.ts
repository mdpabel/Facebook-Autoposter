import { readConfig, writeConfig } from './rss-config';
import { fetchRssItems } from './rss';
import { appendHistory, isPosted } from './rss-history';
import { createPost, createMultiPhotoPost, uploadPhoto } from './facebook';
import { generateFbPost } from './openai-post';

export type AutomationSummary = {
  posted: string[];
  skipped: number;
  failed: { title: string; error: string }[];
  disabled?: boolean;
};

async function publishItem(
  message: string,
  images: string[],
  link: string,
  includeImage: boolean,
): Promise<{ id: string }> {
  const imgs = includeImage ? images.slice(0, 5) : [];

  if (imgs.length > 0) {
    const uploaded = await Promise.all(imgs.map((url) => uploadPhoto(url)));
    const photoIds = uploaded.map((p) => p.id);
    return createMultiPhotoPost({ message, photoIds, link: link || undefined });
  }

  return createPost({ message, link: link || undefined });
}

function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

export async function runAutomation(): Promise<AutomationSummary> {
  const cfg = await readConfig();
  if (!cfg.enabled) return { posted: [], skipped: 0, failed: [], disabled: true };

  const items = await fetchRssItems();
  const freshChecks = await Promise.all(items.map((i) => isPosted(i.id).then((p) => ({ item: i, posted: p }))));
  const fresh = freshChecks.filter((x) => !x.posted).map((x) => x.item);
  const toPost = fresh
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, cfg.maxPostsPerRun);

  const summary: AutomationSummary = { posted: [], skipped: fresh.length - toPost.length, failed: [] };

  const ws = weekStart();
  if (cfg.weekStartDate !== ws) {
    cfg.autoPostsThisWeek = 0;
    cfg.weekStartDate = ws;
  }

  for (const item of toPost) {
    try {
      const message = await generateFbPost(item);
      const result = await publishItem(message, item.images, item.link, cfg.includeImage);
      await appendHistory({ id: item.id, title: item.title, fbPostId: result.id, status: 'posted', timestamp: new Date().toISOString() });
      cfg.autoPostsThisWeek = (cfg.autoPostsThisWeek ?? 0) + 1;
      cfg.lastPostedTitle = item.title;
      summary.posted.push(item.title);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await appendHistory({ id: item.id, title: item.title, status: 'failed', timestamp: new Date().toISOString() });
      summary.failed.push({ title: item.title, error });
    }
  }

  cfg.lastCheckTime = new Date().toISOString();
  await writeConfig(cfg);
  return summary;
}
