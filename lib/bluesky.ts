import { AtpAgent, RichText } from '@atproto/api';
import { fetchRetry } from './rss';

const SERVICE = 'https://bsky.social';
const MAX_GRAPHEMES = 300; // Bluesky post text limit
const MAX_BLOB_BYTES = 1_000_000; // Bluesky image blob limit (~1MB)

// Module-level cache so a warm serverless instance reuses the session.
let cached: AtpAgent | null = null;

export function blueskyConfigured(): boolean {
  return !!(process.env.BLUESKY_IDENTIFIER && process.env.BLUESKY_APP_PASSWORD);
}

async function getAgent(): Promise<AtpAgent | null> {
  if (!blueskyConfigured()) return null;
  if (cached?.session) return cached;
  const agent = new AtpAgent({ service: SERVICE });
  await agent.login({
    identifier: process.env.BLUESKY_IDENTIFIER!,
    password: process.env.BLUESKY_APP_PASSWORD!,
  });
  cached = agent;
  return agent;
}

/** Fit "caption\n\nlink" within Bluesky's 300-grapheme limit, trimming the caption. */
function fitText(caption: string, link: string): string {
  const sep = '\n\n';
  const reserve = [...link].length + sep.length;
  const budget = MAX_GRAPHEMES - reserve;
  if (budget < 20) return link.slice(0, MAX_GRAPHEMES); // link alone is huge
  let text = caption.trim();
  if ([...text].length > budget) {
    text = [...text].slice(0, budget - 1).join('').trimEnd() + '…';
  }
  return `${text}${sep}${link}`;
}

async function uploadImage(agent: AtpAgent, url: string) {
  try {
    const res = await fetchRetry(url);
    if (!res.ok) return null;
    const mime = res.headers.get('content-type') ?? 'image/jpeg';
    if (!mime.startsWith('image/')) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_BLOB_BYTES) return null; // too big — fall back to text+link
    const up = await agent.uploadBlob(bytes, { encoding: mime });
    return up.data.blob;
  } catch {
    return null;
  }
}

/**
 * Publish a single post to Bluesky. Mirrors the Facebook caption: same text (fitted
 * to 300 graphemes), the article link as a clickable facet, and the image embedded
 * when it fits Bluesky's blob limit. Returns null when Bluesky isn't configured.
 */
export async function postToBluesky(params: {
  caption: string;
  link: string;
  imageUrl?: string;
  alt?: string;
}): Promise<{ uri: string } | null> {
  const agent = await getAgent();
  if (!agent) return null;

  const text = fitText(params.caption, params.link);
  const rt = new RichText({ text });
  await rt.detectFacets(agent); // turns the URL into a clickable link

  const record: Record<string, unknown> = { text: rt.text, facets: rt.facets };

  if (params.imageUrl) {
    const blob = await uploadImage(agent, params.imageUrl);
    if (blob) {
      record.embed = {
        $type: 'app.bsky.embed.images',
        images: [{ image: blob, alt: params.alt ?? '' }],
      };
    }
  }

  // agent.post accepts a partial post record and fills in createdAt.
  const res = await agent.post(record as Parameters<AtpAgent['post']>[0]);
  return { uri: res.uri };
}
