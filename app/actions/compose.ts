'use server';

import { getSession } from '@/lib/auth';
import { createPost, schedulePost } from '@/lib/facebook';

export type ComposeResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

export async function publishPost(
  message: string,
  imageUrl: string,
  linkUrl: string
): Promise<ComposeResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  if (!message.trim()) return { ok: false, error: 'Message is required' };
  try {
    const result = await createPost({
      message,
      imageUrl: imageUrl || undefined,
      link: linkUrl || undefined,
    });
    return { ok: true, postId: result.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function schedulePostAction(
  message: string,
  imageUrl: string,
  linkUrl: string,
  scheduledAt: string
): Promise<ComposeResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  if (!message.trim()) return { ok: false, error: 'Message is required' };
  const ts = Math.floor(new Date(scheduledAt).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);
  if (ts < now + 600) return { ok: false, error: 'Scheduled time must be at least 10 minutes in the future' };
  if (ts > now + 30 * 24 * 3600) return { ok: false, error: 'Scheduled time must be within 30 days' };
  try {
    const result = await schedulePost({ message, scheduledTime: ts, link: linkUrl || undefined });
    return { ok: true, postId: result.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
