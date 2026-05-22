import { readConfig } from '@/lib/rss-config';
import { readHistory } from '@/lib/rss-history';
import { RssClient } from './rss-client';

export default async function RssPage() {
  const [config, history] = await Promise.all([readConfig(), readHistory()]);
  const feedUrl = process.env.RSS_FEED_URL ?? '(not set)';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">RSS Automation</h1>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
          config.enabled
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
          {config.enabled ? 'Automation ON' : 'Automation OFF'}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500 mb-1">RSS Feed URL</p>
        <p className="font-mono text-sm text-gray-800 break-all">{feedUrl}</p>
      </div>

      <RssClient config={config} history={history} />
    </div>
  );
}
