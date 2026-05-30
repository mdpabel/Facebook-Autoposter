import Parser from 'rss-parser';

export type RssItem = {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  images: string[];
  headings: string[];
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

function extractHeadings(html: string): string[] {
  const headingRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  const tagRe = /<[^>]+>/g;
  const headings: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(html)) !== null) {
    const text = m[1].replace(tagRe, '').trim();
    if (text) headings.push(text);
  }
  return headings;
}

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

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

/**
 * Fetch the article page and pull its Open Graph image — the same "featured image"
 * Facebook uses for link previews. Used as a fallback when the feed carries no images.
 */
export async function fetchOgImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, cache: 'no-store' });
    if (!res.ok) return undefined;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return m?.[1];
  } catch {
    return undefined;
  }
}

export type PostImage = { url: string; alt: string };

/**
 * Pull the full image set for an article from the WordPress REST API.
 *
 * This site is headless WordPress: the RSS feed and Astro frontend strip inline
 * images, but the WP API's content.rendered keeps every <img>. We derive the post
 * slug from the article link and query WP_API_BASE for the featured image + all
 * content images (featured first, deduped). Returns [] if WP_API_BASE is unset or
 * the post can't be found, so callers can fall back to the OG image.
 */
export async function fetchPostImages(link: string): Promise<PostImage[]> {
  const base = process.env.WP_API_BASE;
  if (!base || !link) return [];
  try {
    const slug = new URL(link).pathname.split('/').filter(Boolean).pop();
    if (!slug) return [];
    const api = `${base.replace(/\/$/, '')}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed=1`;
    const res = await fetch(api, { headers: { 'user-agent': UA }, cache: 'no-store' });
    if (!res.ok) return [];
    const arr = (await res.json()) as Array<{
      content?: { rendered?: string };
      _embedded?: { 'wp:featuredmedia'?: Array<{ source_url?: string; alt_text?: string }> };
    }>;
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const post = arr[0];

    const seen = new Set<string>();
    const out: PostImage[] = [];
    const add = (url?: string, alt = '') => {
      if (!url) return;
      const u = url.trim();
      if (!u || u.startsWith('data:') || /\.svg(\?|$)/i.test(u)) return;
      if (/(logo|avatar|gravatar|emoji|sprite|spinner|placeholder)/i.test(u)) return;
      if (seen.has(u)) return;
      seen.add(u);
      out.push({ url: u, alt: alt.trim() });
    };

    // Featured image first — this is the "main post".
    const fm = post._embedded?.['wp:featuredmedia']?.[0];
    add(fm?.source_url, fm?.alt_text);

    // Then every inline content image, in document order.
    const html = post.content?.rendered ?? '';
    const imgRe = /<img\b[^>]*>/gi;
    let tag: RegExpExecArray | null;
    while ((tag = imgRe.exec(html)) !== null) {
      const src = tag[0].match(/\bsrc=["']([^"']+)["']/i)?.[1];
      const alt = tag[0].match(/\balt=["']([^"']*)["']/i)?.[1] ?? '';
      add(src, alt);
    }

    return out;
  } catch {
    return [];
  }
}

export async function fetchRssItems(): Promise<RssItem[]> {
  const feedUrl = process.env.RSS_FEED_URL;
  if (!feedUrl) throw new Error('RSS_FEED_URL not set');
  const feed = await parser.parseURL(feedUrl);
  return (feed.items ?? []).map((item) => {
    const html = item['content:encoded'] ?? item.content ?? '';
    const images = extractImages(item);
    const headings = extractHeadings(html);
    return {
      id: (item.guid || item.link || item.title || String(Date.now())).trim(),
      title: item.title ?? '(no title)',
      link: item.link ?? '',
      description: (item.contentSnippet ?? item.content ?? item.summary ?? '').slice(0, 500),
      pubDate: item.pubDate ?? item.isoDate ?? new Date().toISOString(),
      image: images[0],
      images,
      headings,
    };
  });
}
