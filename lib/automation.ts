import { readConfig, writeConfig } from './rss-config';
import { fetchRssItems } from './rss';
import { appendHistory, isPosted } from './rss-history';
import { createPost } from './facebook';

export type AutomationSummary = {
  posted: string[];
  skipped: number;
  failed: { title: string; error: string }[];
  disabled?: boolean;
};

function format(template: string, item: { title: string; link: string; description: string }) {
  return template
    .replace('{title}', item.title)
    .replace('{link}', item.link)
    .replace('{description}', item.description);
}

function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString();
}

export async function runAutomation(): Promise<AutomationSummary> {
  const cfg = readConfig();
  if (!cfg.enabled) return { posted: [], skipped: 0, failed: [], disabled: true };

  const items = await fetchRssItems();
  const fresh = items.filter((i) => !isPosted(i.id));
  const toPost = fresh
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, cfg.maxPostsPerRun);

  const summary: AutomationSummary = {
    posted: [],
    skipped: fresh.length - toPost.length,
    failed: [],
  };

  const ws = weekStart();
  if (cfg.weekStartDate !== ws) {
    cfg.autoPostsThisWeek = 0;
    cfg.weekStartDate = ws;
  }

  for (const item of toPost) {
    try {
      const message = format(cfg.template, item);
      const result = await createPost({
        message,
        imageUrl: cfg.includeImage ? item.image : undefined,
      });
      appendHistory({ id: item.id, title: item.title, fbPostId: result.id, status: 'posted', timestamp: new Date().toISOString() });
      cfg.autoPostsThisWeek = (cfg.autoPostsThisWeek ?? 0) + 1;
      cfg.lastPostedTitle = item.title;
      summary.posted.push(item.title);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      appendHistory({ id: item.id, title: item.title, status: 'failed', timestamp: new Date().toISOString() });
      summary.failed.push({ title: item.title, error });
    }
  }

  cfg.lastCheckTime = new Date().toISOString();
  writeConfig(cfg);
  return summary;
}
