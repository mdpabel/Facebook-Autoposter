'use client';

import { useState, useTransition } from 'react';
import { testConnectionAction, testRssFeedAction } from '@/app/actions/settings';

type TestResult = { ok: boolean; message: string };

export function SettingsClient() {
  const [connResult, setConnResult] = useState<TestResult | null>(null);
  const [rssResult, setRssResult] = useState<TestResult | null>(null);
  const [connPending, startConn] = useTransition();
  const [rssPending, startRss] = useTransition();

  function testConnection() {
    startConn(async () => {
      const res = await testConnectionAction();
      setConnResult(
        res.ok
          ? { ok: true, message: `Connected as: ${(res as { data: { name?: string; id: string } }).data?.name ?? ''} (${(res as { data: { id: string } }).data?.id})` }
          : { ok: false, message: res.error ?? 'Unknown error' }
      );
    });
  }

  function testRss() {
    startRss(async () => {
      const res = await testRssFeedAction();
      setRssResult(
        res.ok
          ? { ok: true, message: `${(res as { count: number }).count} items found. First: "${(res as { firstTitle: string }).firstTitle}"` }
          : { ok: false, message: res.error ?? 'Unknown error' }
      );
    });
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <h2 className="font-semibold text-gray-900">Diagnostics</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Token health</h3>
        <button
          onClick={testConnection}
          disabled={connPending}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {connPending ? 'Testing…' : 'Test connection'}
        </button>
        {connResult && (
          <p className={`text-sm ${connResult.ok ? 'text-green-700' : 'text-red-600'}`}>
            {connResult.ok ? '✓' : '✗'} {connResult.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">RSS feed</h3>
        <button
          onClick={testRss}
          disabled={rssPending}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {rssPending ? 'Testing…' : 'Test RSS feed'}
        </button>
        {rssResult && (
          <p className={`text-sm ${rssResult.ok ? 'text-green-700' : 'text-red-600'}`}>
            {rssResult.ok ? '✓' : '✗'} {rssResult.message}
          </p>
        )}
      </div>
    </div>
  );
}
