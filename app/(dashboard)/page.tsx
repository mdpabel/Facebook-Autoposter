import { getPage, getPosts } from '@/lib/facebook';
import { readConfig } from '@/lib/rss-config';
import Image from 'next/image';
import { RssToggle } from './rss-toggle';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function DashboardPage() {
  const [page, posts, rssConfig] = await Promise.all([
    getPage().catch(() => null),
    getPosts(5).catch(() => ({ data: [] })),
    readConfig(),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Page info */}
      {page ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
          {page.picture?.data?.url && (
            <Image
              src={page.picture.data.url}
              alt={page.name}
              width={56}
              height={56}
              className="rounded-full"
            />
          )}
          <div>
            <p className="font-semibold text-gray-900 text-lg">{page.name}</p>
            <p className="text-sm text-gray-500">
              {page.followers_count?.toLocaleString()} followers
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Could not load Page info — check your FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent posts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900">Recent Posts</h2>
          {posts.data.length === 0 ? (
            <p className="text-sm text-gray-400">No posts found.</p>
          ) : (
            <ul className="space-y-3">
              {posts.data.map((p) => (
                <li key={p.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{p.message ?? '(no message)'}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-400">{timeAgo(p.created_time)}</span>
                    {p.permalink_url && (
                      <a
                        href={p.permalink_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View on FB
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RSS status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">RSS Automation</h2>
            <RssToggle enabled={rssConfig.enabled} />
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Status</span>
              <span className={`font-medium ${rssConfig.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                {rssConfig.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Last check</span>
              <span>{rssConfig.lastCheckTime ? timeAgo(rssConfig.lastCheckTime) : 'Never'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Last posted</span>
              <span className="text-right max-w-[180px] truncate">{rssConfig.lastPostedTitle ?? 'None'}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Posts this week</span>
              <span>{rssConfig.autoPostsThisWeek ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
