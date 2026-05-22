import { SettingsClient } from './settings-client';

const ENV_VARS = [
  'FB_APP_ID',
  'FB_APP_SECRET',
  'FB_PAGE_ID',
  'FB_PAGE_ACCESS_TOKEN',
  'BASIC_AUTH_EMAIL',
  'BASIC_AUTH_PASSWORD',
  'RSS_FEED_URL',
  'CRON_SECRET',
];

export default function SettingsPage() {
  const envStatus = ENV_VARS.map((name) => ({
    name,
    set: !!process.env[name],
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Environment Variables</h2>
        <ul className="space-y-2">
          {envStatus.map(({ name, set }) => (
            <li key={name} className="flex items-center justify-between text-sm">
              <span className="font-mono text-gray-700">{name}</span>
              <span className={`font-medium ${set ? 'text-green-600' : 'text-red-500'}`}>
                {set ? '✓ set' : '✗ missing'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <SettingsClient />
    </div>
  );
}
