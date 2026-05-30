import { readConfig, writeConfig } from './rss-config';
import { fetchRssItems, fetchOgImage, fetchPostImages, type PostImage } from './rss';
import { appendHistory, isPosted } from './rss-history';
import { createPost, schedulePhotoPost } from './facebook';
import { generateFbPost, generateFbPostFromImage } from './openai-post';
import redis from './redis';

// Hard cap on posts created per article so a 50-image article can't flood the queue.
const MAX_IMAGES_PER_ARTICLE = 12;

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
    try {
      // Build the image list (featured first, then every content image — one post each).
      // Priority: feed images → WordPress REST API (full content) → article OG image.
      let images: PostImage[] = [];
      if (cfg.includeImage) {
        images = item.images.map((url) => ({ url, alt: '' }));
        if (images.length === 0 && item.link) {
          images = await fetchPostImages(item.link);
        }
        if (images.length === 0 && item.link) {
          const og = await fetchOgImage(item.link);
          if (og) images = [{ url: og, alt: '' }];
        }
        images = images.slice(0, MAX_IMAGES_PER_ARTICLE);
      }

      let lastPostId: string | undefined;

      if (images.length === 0) {
        // No image anywhere → text-only post with the link.
        const text = await generateFbPost(item);
        const res = await createPost({ message: `${text}\n\n${item.link}` });
        lastPostId = res.id;
      } else {
        // One post per image. The first (featured) publishes immediately; the rest
        // are scheduled one hour apart via claimSlot().
        let postedCount = 0;
        for (const img of images) {
          try {
            const message = await generateFbPostFromImage({
              imageUrl: img.url,
              alt: img.alt,
              headings: item.headings,
              title: item.title,
              link: item.link,
            });
            const slot = await claimSlot();
            const res = await schedulePhotoPost({ message, imageUrl: img.url, scheduledTime: slot });
            lastPostId = res.id;
            postedCount++;
          } catch (imgErr) {
            const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
            summary.failed.push({ title: `${item.title} (image)`, error: msg });
          }
        }
        // If every image failed, surface the article as failed and retry next run.
        if (postedCount === 0) throw new Error('All image posts failed');
      }

      await appendHistory({
        id: item.id,
        title: item.title,
        fbPostId: lastPostId,
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
