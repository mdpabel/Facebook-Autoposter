'use server';

import { getSession } from '@/lib/auth';
import { deletePost } from '@/lib/facebook';

export async function deletePostAction(postId: string): Promise<{ ok: boolean; error?: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: 'Unauthorized' };
  try {
    await deletePost(postId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
