'use client';

import { useState, useTransition } from 'react';
import { saveRssConfig } from '@/app/actions/rss';
import { toast } from 'sonner';

export function RssToggle({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const res = await saveRssConfig({ enabled: next });
      if (!res.ok) {
        setEnabled(!next);
        toast.error(res.error ?? 'Failed to update');
      } else {
        toast.success(next ? 'Automation enabled' : 'Automation disabled');
      }
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-green-500' : 'bg-gray-300'
      } disabled:opacity-60`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
