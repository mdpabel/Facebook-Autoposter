const BASE = 'https://graph.facebook.com/v21.0';

function tok() {
  const t = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!t) throw new Error('FB_PAGE_ACCESS_TOKEN not set');
  return t;
}
function pid() {
  const id = process.env.FB_PAGE_ID;
  if (!id) throw new Error('FB_PAGE_ID not set');
  return id;
}

async function fbFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: 'no-store', ...init });
  const json = await res.json();
  if (json.error) {
    throw new Error(`FB API: ${json.error.message} (code ${json.error.code})`);
  }
  return json as T;
}

export type FBPage = {
  id: string;
  name: string;
  picture: { data: { url: string } };
  followers_count: number;
};

export type FBPost = {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  scheduled_publish_time?: number;
};

export type FBPostsResponse = {
  data: FBPost[];
  paging?: { cursors?: { after?: string; before?: string }; next?: string };
};

export function getPage(): Promise<FBPage> {
  return fbFetch(`/${pid()}?fields=name,picture,followers_count&access_token=${tok()}`);
}

export function getPosts(limit = 10, after?: string): Promise<FBPostsResponse> {
  const cursor = after ? `&after=${encodeURIComponent(after)}` : '';
  return fbFetch(
    `/${pid()}/posts?fields=message,created_time,permalink_url,full_picture,scheduled_publish_time&limit=${limit}${cursor}&access_token=${tok()}`
  );
}

/** Upload a photo as unpublished — returns the photo's internal ID for use in attached_media. */
export function uploadPhoto(imageUrl: string): Promise<{ id: string }> {
  const body = new URLSearchParams({ url: imageUrl, published: 'false', access_token: tok() });
  return fbFetch(`/${pid()}/photos`, { method: 'POST', body });
}

/**
 * Create a feed post with multiple attached photos (carousel-style multi-image post).
 * photoIds must come from uploadPhoto().
 */
export function createMultiPhotoPost(params: {
  message: string;
  photoIds: string[];
  link?: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({ message: params.message, access_token: tok() });
  if (params.link) body.set('link', params.link);
  body.set('attached_media', JSON.stringify(params.photoIds.map((id) => ({ media_fbid: id }))));
  return fbFetch(`/${pid()}/feed`, { method: 'POST', body });
}

export function createPost(params: {
  message: string;
  link?: string;
  imageUrl?: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({ message: params.message, access_token: tok() });
  if (params.link) body.set('link', params.link);
  if (params.imageUrl) {
    body.set('url', params.imageUrl);
    return fbFetch(`/${pid()}/photos`, { method: 'POST', body });
  }
  return fbFetch(`/${pid()}/feed`, { method: 'POST', body });
}

export function schedulePost(params: {
  message: string;
  scheduledTime: number;
  link?: string;
}): Promise<{ id: string }> {
  const body = new URLSearchParams({
    message: params.message,
    access_token: tok(),
    published: 'false',
    scheduled_publish_time: String(params.scheduledTime),
  });
  if (params.link) body.set('link', params.link);
  return fbFetch(`/${pid()}/feed`, { method: 'POST', body });
}

/**
 * Post a single photo immediately or schedule it for a future time.
 * For immediate posts: POST directly to /photos.
 * For scheduled posts: upload photo as unpublished, then create a scheduled feed post
 * with attached_media so it appears in /{page}/scheduled_posts.
 */
export async function schedulePhotoPost(params: {
  message: string;
  imageUrl: string;
  scheduledTime?: number;
}): Promise<{ id: string }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const isScheduled = !!params.scheduledTime && params.scheduledTime > nowSec + 60;

  if (!isScheduled) {
    const body = new URLSearchParams({
      url: params.imageUrl,
      message: params.message,
      access_token: tok(),
    });
    return fbFetch(`/${pid()}/photos`, { method: 'POST', body });
  }

  // Step 1: upload photo as unpublished
  const photoBody = new URLSearchParams({ url: params.imageUrl, published: 'false', access_token: tok() });
  const photo = await fbFetch<{ id: string }>(`/${pid()}/photos`, { method: 'POST', body: photoBody });

  // Step 2: create scheduled feed post with attached photo — appears in /scheduled_posts
  const feedBody = new URLSearchParams({
    message: params.message,
    published: 'false',
    scheduled_publish_time: String(params.scheduledTime),
    attached_media: JSON.stringify([{ media_fbid: photo.id }]),
    access_token: tok(),
  });
  return fbFetch(`/${pid()}/feed`, { method: 'POST', body: feedBody });
}

export function getScheduledPosts(): Promise<FBPostsResponse> {
  return fbFetch(
    `/${pid()}/scheduled_posts?fields=message,created_time,scheduled_publish_time,permalink_url,full_picture&access_token=${tok()}`
  );
}

/** Immediately publish a scheduled post. Works for both feed posts and photo posts. */
export function publishScheduledPost(postId: string): Promise<{ id: string }> {
  const body = new URLSearchParams({ published: 'true', access_token: tok() });
  return fbFetch(`/${postId}`, { method: 'POST', body });
}

export function deletePost(postId: string): Promise<{ success: boolean }> {
  return fbFetch(`/${postId}?access_token=${tok()}`, { method: 'DELETE' });
}

export function testToken(): Promise<{ id: string; name: string; type: string }> {
  return fbFetch(`/me?access_token=${tok()}`);
}
