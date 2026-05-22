'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fetchFeedAction, postRssItemAction, runAutomationAction, saveRssConfig } from '@/app/actions/rss';
import { toast } from 'sonner';
import type { RssConfig } from '@/lib/rss-config';
import type { HistoryEntry } from '@/lib/rss-history';
import type { RssItem } from '@/lib/rss';

type FeedItem = RssItem & { posted: boolean };

export function RssClient({ config: initialConfig, history }: { config: RssConfig; history: HistoryEntry[] }) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [fetchError, setFetchError] = useState('');
  const [postingId, setPostingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [savePending, startSave] = useTransition();
  const [runPending, startRun] = useTransition();

  function fetchFeed() {
    startTransition(async () => {
      setFetchError('');
      const res = await fetchFeedAction();
      if (!res.ok) { setFetchError(res.error ?? 'Fetch failed'); return; }
      setFeedItems(res.items as FeedItem[]);
    });
  }

  function postItem(item: FeedItem) {
    setPostingId(item.id);
    startTransition(async () => {
      const res = await postRssItemAction(item);
      setPostingId(null);
      if (!res.ok) { toast.error(res.error ?? 'Failed to post'); return; }
      toast.success('Posted to Facebook!');
      setFeedItems((prev) => prev.map((i) => i.id === item.id ? { ...i, posted: true } : i));
      router.refresh();
    });
  }

  function saveSettings() {
    startSave(async () => {
      const res = await saveRssConfig(config);
      if (!res.ok) { toast.error(res.error ?? 'Save failed'); return; }
      toast.success('Settings saved');
      router.refresh();
    });
  }

  function runNow() {
    startRun(async () => {
      const res = await runAutomationAction();
      if (!res.ok) { toast.error(res.error ?? 'Run failed'); return; }
      const s = res.summary!;
      if (s.disabled) { toast.info('Automation is disabled'); return; }
      toast.success(`Done: ${s.posted.length} posted, ${s.skipped} skipped, ${s.failed.length} failed`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Settings</h2>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Enabled</span>
          <button
            onClick={() => setConfig((c) => ({ ...c, enabled: !c.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Post template</label>
          <textarea
            rows={3}
            value={config.template}
            onChange={(e) => setConfig((c) => ({ ...c, template: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">Placeholders: {'{title}'}, {'{link}'}, {'{description}'}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Check interval</label>
            <select
              value={config.checkInterval}
              onChange={(e) => setConfig((c) => ({ ...c, checkInterval: e.target.value as RssConfig['checkInterval'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(['15min', '30min', '1hr', '3hr', '6hr'] as const).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max posts per run</label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.maxPostsPerRun}
              onChange={(e) => setConfig((c) => ({ ...c, maxPostsPerRun: Number(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Include featured image</span>
          <button
            onClick={() => setConfig((c) => ({ ...c, includeImage: !c.includeImage }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.includeImage ? 'bg-blue-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config.includeImage ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveSettings}
            disabled={savePending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {savePending ? 'Saving…' : 'Save settings'}
          </button>
          <button
            onClick={runNow}
            disabled={runPending}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-60"
          >
            {runPending ? 'Running…' : 'Run now'}
          </button>
        </div>
      </div>

      {/* Feed preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Feed Preview</h2>
          <button
            onClick={fetchFeed}
            disabled={pending}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {pending ? 'Fetching…' : 'Fetch now'}
          </button>
        </div>
        {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}
        {feedItems.length === 0 && !fetchError && (
          <p className="text-sm text-gray-400">Click &quot;Fetch now&quot; to load items.</p>
        )}
        {feedItems.length > 0 && (
          <ul className="space-y-3">
            {feedItems.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(item.pubDate).toLocaleDateString()}</p>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{item.link}</a>
                </div>
                <div className="shrink-0">
                  {item.posted ? (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Posted</span>
                  ) : (
                    <button
                      onClick={() => postItem(item)}
                      disabled={postingId === item.id || pending}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-full disabled:opacity-60"
                    >
                      {postingId === item.id ? '…' : 'Post now'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">History (last 20)</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No history yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((entry, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm pb-2 border-b border-gray-100 last:border-0">
                <span className="truncate text-gray-700">{entry.title}</span>
                <div className="shrink-0 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    entry.status === 'posted' ? 'bg-green-100 text-green-700' :
                    entry.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{entry.status}</span>
                  <span className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
