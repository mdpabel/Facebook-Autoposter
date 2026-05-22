'use client';

import { useState, useTransition } from 'react';
import { publishPost, schedulePostAction } from '@/app/actions/compose';
import { toast } from 'sonner';

export default function ComposePage() {
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [result, setResult] = useState<{ postId: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function validate() {
    const errors: Record<string, string> = {};
    if (!message.trim()) errors.message = 'Message is required';
    if (mode === 'schedule' && !scheduledAt) errors.scheduledAt = 'Scheduled time is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function submit() {
    if (!validate()) return;
    startTransition(async () => {
      const res =
        mode === 'now'
          ? await publishPost(message, imageUrl, linkUrl)
          : await schedulePostAction(message, imageUrl, linkUrl, scheduledAt);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        setResult({ postId: res.postId });
        toast.success(mode === 'now' ? 'Post published!' : 'Post scheduled!');
        setMessage(''); setImageUrl(''); setLinkUrl(''); setScheduledAt('');
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Compose Post</h1>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          Post ID: <span className="font-mono">{result.postId}</span>
          <button className="ml-4 text-xs underline" onClick={() => setResult(null)}>Dismiss</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            rows={5}
            value={message}
            onChange={(e) => { setMessage(e.target.value); setFieldErrors((p) => ({ ...p, message: '' })); }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What's on your mind?"
          />
          {fieldErrors.message && <p className="text-xs text-red-600 mt-1">{fieldErrors.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Image URL (optional)</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link URL (optional)</label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Publish</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode('now')}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                mode === 'now' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Publish now
            </button>
            <button
              type="button"
              onClick={() => setMode('schedule')}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                mode === 'schedule' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Schedule
            </button>
          </div>
        </div>

        {mode === 'schedule' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => { setScheduledAt(e.target.value); setFieldErrors((p) => ({ ...p, scheduledAt: '' })); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {fieldErrors.scheduledAt && <p className="text-xs text-red-600 mt-1">{fieldErrors.scheduledAt}</p>}
            <p className="text-xs text-gray-400 mt-1">Must be 10 min–30 days from now</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={pending}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {pending ? 'Posting…' : mode === 'now' ? 'Publish now' : 'Schedule post'}
        </button>
      </div>
    </div>
  );
}
