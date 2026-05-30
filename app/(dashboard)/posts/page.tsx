import { getPosts } from '@/lib/facebook';
import { PostsClient } from './posts-client';

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const { after } = await searchParams;
  const posts = await getPosts(20, after).catch(() => ({ data: [], paging: undefined }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
      <PostsClient posts={posts.data} nextCursor={posts.paging?.cursors?.after} />
    </div>
  );
}
