import Parser from 'rss-parser';

export type RssItem = {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
};

type CustomItem = {
  'media:content'?: { $?: { url?: string } };
  'media:thumbnail'?: { $?: { url?: string } };
  enclosure?: { url?: string; type?: string };
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: false }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
    ],
  },
});

function extractImage(item: CustomItem & Parser.Item): string | undefined {
  const mc = item['media:content'];
  if (mc?.$?.url) return mc.$.url;
  const mt = item['media:thumbnail'];
  if (mt?.$?.url) return mt.$.url;
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) return item.enclosure.url;
  return undefined;
}

export async function fetchRssItems(): Promise<RssItem[]> {
  const feedUrl = process.env.RSS_FEED_URL;
  if (!feedUrl) throw new Error('RSS_FEED_URL not set');
  const feed = await parser.parseURL(feedUrl);
  return (feed.items ?? []).map((item) => ({
    id: (item.guid || item.link || item.title || String(Date.now())).trim(),
    title: item.title ?? '(no title)',
    link: item.link ?? '',
    description: (item.contentSnippet ?? item.content ?? item.summary ?? '').slice(0, 500),
    pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
    image: extractImage(item),
  }));
}
