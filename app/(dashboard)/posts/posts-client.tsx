'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePostAction, publishNowAction } from '@/app/actions/posts';
import { toast } from 'sonner';
import type { FBPost } from '@/lib/facebook';

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

function fmtUnix(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

type Tab = 'published' | 'scheduled';

interface Props {
  posts: FBPost[];
  scheduledPosts: FBPost[];
  activeTab: Tab;
  nextCursor?: string;
}

export function PostsClient({ posts, scheduledPosts, activeTab, nextCursor }: Props) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'publish'>('delete');
  const [actionId, setActionId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function switchTab(tab: Tab) {
    router.push(tab === 'scheduled' ? '?tab=scheduled' : '?tab=published');
  }

  function openConfirm(id: string, action: 'delete' | 'publish') {
    setConfirmId(id);
    setConfirmAction(action);
  }

  function runAction(id: string) {
    setActionId(id);
    setConfirmId(null);
    startTransition(async () => {
      const res =
        confirmAction === 'delete'
          ? await deletePostAction(id)
          : await publishNowAction(id);
      setActionId(null);
      if (!res.ok) {
        toast.error(res.error ?? `${confirmAction === 'delete' ? 'Delete' : 'Publish'} failed`);
      } else {
        toast.success(confirmAction === 'delete' ? 'Post deleted' : 'Post published!');
        router.refresh();
      }
    });
  }

  const visiblePosts = activeTab === 'scheduled' ? scheduledPosts : posts;

  return (
    <>
      {/* Confirm dialog */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-900">
              {confirmAction === 'delete' ? 'Delete post?' : 'Publish now?'}
            </h3>
            <p className="text-sm text-gray-500">
              {confirmAction === 'delete'
                ? 'This will permanently delete the post from your Facebook Page.'
                : 'This will publish the scheduled post immediately.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => runAction(confirmId)}
                className={`flex-1 py-2 text-white rounded-lg text-sm font-medium ${
                  confirmAction === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmAction === 'delete' ? 'Delete' : 'Publish now'}
              </button>
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['published', 'scheduled'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'scheduled' && scheduledPosts.length > 0 && (
              <span className="ml-1.5 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded-full">
                {scheduledPosts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {visiblePosts.length === 0 ? (
        <p className="text-sm text-gray-400">
          {activeTab === 'scheduled' ? 'No scheduled posts.' : 'No posts found.'}
        </p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">
                  {activeTab === 'scheduled' ? 'Scheduled for' : 'Created'}
                </th>
                {activeTab === 'published' && (
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                )}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visiblePosts.map((p) => {
                const isScheduled = activeTab === 'scheduled';
                const busy = actionId === p.id;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    {/* Message + image thumbnail */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="flex items-start gap-3">
                        {p.full_picture && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.full_picture}
                            alt=""
                            className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-gray-800">{p.message ?? '(no message)'}</p>
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
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {isScheduled && p.scheduled_publish_time
                        ? fmtUnix(p.scheduled_publish_time)
                        : fmt(p.created_time)}
                    </td>

                    {/* Status badge (published tab only) */}
                    {!isScheduled && (
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          Published
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        {isScheduled && (
                          <button
                            onClick={() => openConfirm(p.id, 'publish')}
                            disabled={busy || pending}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                          >
                            {busy && confirmAction === 'publish' ? 'Publishing…' : 'Publish now'}
                          </button>
                        )}
                        <button
                          onClick={() => openConfirm(p.id, 'delete')}
                          disabled={busy || pending}
                          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          {busy && confirmAction === 'delete' ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more (published tab only) */}
      {activeTab === 'published' && nextCursor && (
        <div className="flex justify-center">
          <a
            href={`?after=${encodeURIComponent(nextCursor)}`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Load more
          </a>
        </div>
      )}
    </>
  );
}
