'use server';

import { getSession } from '@/lib/auth';
import { testToken } from '@/lib/facebook';
import { fetchRssItems } from '@/lib/rss';

export async function testConnectionAction() {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const result = await testToken();
    return { ok: true, data: result };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function testRssFeedAction() {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    const items = await fetchRssItems();
    return { ok: true, count: items.length, firstTitle: items[0]?.title ?? '(no items)' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
