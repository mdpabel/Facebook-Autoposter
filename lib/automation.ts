import { readConfig, writeConfig } from './rss-config';
import { fetchRssItems } from './rss';
import { appendHistory, isPosted } from './rss-history';
import { createPost, schedulePhotoPost } from './facebook';
import { generateFbPost, generateFbPostFromImage } from './openai-post';
import redis from './redis';

export type AutomationSummary = {
  posted: string[];
  skipped: number;
  failed: { title: string; error: string }[];
  disabled?: boolean;
};

const NEXT_SLOT_KEY = 'rss:next_slot';

async function claimSlot(): Promise<number> {
  const stored = await redis.get<number>(NEXT_SLOT_KEY);
  const nowSec = Math.floor(Date.now() / 1000);
  const slot = stored && stored > nowSec ? stored : nowSec;
  await redis.set(NEXT_SLOT_KEY, slot + 3600);
  return slot;
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
    const featuredImage = cfg.includeImage ? item.image : undefined;

    try {
      let result: { id: string };

      if (featuredImage) {
        const message = await generateFbPostFromImage({
          imageUrl: featuredImage,
          headings: item.headings,
          title: item.title,
          link: item.link,
        });
        const slot = await claimSlot();
        result = await schedulePhotoPost({
          message,
          imageUrl: featuredImage,
          scheduledTime: slot,
        });
      } else {
        // No image: text-only post with link appended
        const text = await generateFbPost(item);
        result = await createPost({ message: `${text}\n\n${item.link}` });
      }

      await appendHistory({
        id: item.id,
        title: item.title,
        fbPostId: result.id,
        status: 'posted',
        timestamp: new Date().toISOString(),
      });
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
