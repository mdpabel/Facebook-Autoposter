'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePostAction } from '@/app/actions/posts';
import { toast } from 'sonner';
import type { FBPost } from '@/lib/facebook';

function fmt(iso: string) {
  return new Date(iso).toLocaleString();
}

export function PostsClient({ posts, nextCursor }: { posts: FBPost[]; nextCursor?: string }) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete(id: string) { setConfirmId(id); }

  function doDelete(id: string) {
    setDeletingId(id);
    setConfirmId(null);
    startTransition(async () => {
      const res = await deletePostAction(id);
      setDeletingId(null);
      if (!res.ok) {
        toast.error(res.error ?? 'Delete failed');
      } else {
        toast.success('Post deleted');
        router.refresh();
      }
    });
  }

  if (posts.length === 0) {
    return <p className="text-sm text-gray-400">No posts found.</p>;
  }

  return (
    <>
      {confirmId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl space-y-4">
            <h3 className="font-semibold text-gray-900">Delete post?</h3>
            <p className="text-sm text-gray-500">This will permanently delete the post from your Facebook Page.</p>
            <div className="flex gap-3">
              <button
                onClick={() => doDelete(confirmId)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
              >
                Delete
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Message</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {posts.map((p) => {
              const isScheduled = !!p.scheduled_publish_time && p.scheduled_publish_time * 1000 > Date.now();
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate text-gray-800">{p.message ?? '(no message)'}</p>
                    {p.permalink_url && (
                      <a href={p.permalink_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        View on FB
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmt(p.created_time)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isScheduled ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isScheduled ? 'Scheduled' : 'Published'}
                    </span>
                    {isScheduled && p.scheduled_publish_time && (
                      <p className="text-xs text-gray-400 mt-0.5">{fmt(new Date(p.scheduled_publish_time * 1000).toISOString())}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => confirmDelete(p.id)}
                      disabled={deletingId === p.id || pending}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      {deletingId === p.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {nextCursor && (
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
