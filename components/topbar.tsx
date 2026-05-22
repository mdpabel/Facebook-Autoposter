'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Topbar({ email }: { email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4 shrink-0">
      <span className="text-sm text-gray-600">{email}</span>
      <button
        onClick={logout}
        disabled={loading}
        className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Logging out…' : 'Logout'}
      </button>
    </header>
  );
}
