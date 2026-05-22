import Parser from 'rss-parser';

export type RssItem = {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  images: string[];
};

type MediaContent = { $?: { url?: string } };

type CustomItem = {
  'media:content'?: MediaContent | MediaContent[];
  'media:thumbnail'?: MediaContent;
  'content:encoded'?: string;
  enclosure?: { url?: string; type?: string };
};

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: false }],
      ['content:encoded', 'content:encoded', { keepArray: false }],
    ],
  },
});

function extractImages(item: CustomItem & Parser.Item): string[] {
  const seen = new Set<string>();
  const add = (url: string | undefined) => { if (url && !seen.has(url)) seen.add(url); };

  const mc = item['media:content'];
  if (Array.isArray(mc)) {
    mc.forEach((m) => add(m.$?.url));
  } else if (mc) {
    add(mc.$?.url);
  }

  add(item['media:thumbnail']?.$?.url);

  if (item.enclosure?.url && item.enclosure.type?.startsWith('image/')) {
    add(item.enclosure.url);
  }

  // Fallback: extract <img src> from content HTML (WordPress and many CMS feeds)
  const html = item['content:encoded'] ?? item.content ?? '';
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    add(m[1]);
  }

  return [...seen];
}

export async function fetchRssItems(): Promise<RssItem[]> {
  const feedUrl = process.env.RSS_FEED_URL;
  if (!feedUrl) throw new Error('RSS_FEED_URL not set');
  const feed = await parser.parseURL(feedUrl);
  return (feed.items ?? []).map((item) => {
    const images = extractImages(item);
    return {
      id: (item.guid || item.link || item.title || String(Date.now())).trim(),
      title: item.title ?? '(no title)',
      link: item.link ?? '',
      description: (item.contentSnippet ?? item.content ?? item.summary ?? '').slice(0, 500),
      pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
      image: images[0],
      images,
    };
  });
}
