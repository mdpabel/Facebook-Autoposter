import { getPosts, getScheduledPosts } from '@/lib/facebook';
import { PostsClient } from './posts-client';

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string; tab?: string }>;
}) {
  const { after, tab } = await searchParams;
  const activeTab = tab === 'scheduled' ? 'scheduled' : 'published';

  const [publishedRes, scheduledRes] = await Promise.all([
    getPosts(20, after).catch(() => ({ data: [], paging: undefined })),
    getScheduledPosts().catch(() => ({ data: [], paging: undefined })),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
      <PostsClient
        posts={publishedRes.data}
        scheduledPosts={scheduledRes.data}
        activeTab={activeTab}
        nextCursor={publishedRes.paging?.cursors?.after}
      />
    </div>
  );
}
