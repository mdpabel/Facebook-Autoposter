import redis from './redis';

export type RssConfig = {
  enabled: boolean;
  template: string;
  checkInterval: '15min' | '30min' | '1hr' | '3hr' | '6hr';
  includeImage: boolean;
  maxPostsPerRun: number;
  lastCheckTime?: string;
  lastPostedTitle?: string;
  autoPostsThisWeek: number;
  weekStartDate?: string;
};

export const DEFAULT_CONFIG: RssConfig = {
  enabled: false,
  template: '{title}\n\n{link}',
  checkInterval: '1hr',
  includeImage: true,
  maxPostsPerRun: 1,
  autoPostsThisWeek: 0,
};

const KEY = 'rss:config';

export async function readConfig(): Promise<RssConfig> {
  const raw = await redis.get<RssConfig>(KEY);
  if (!raw) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...raw };
}

export async function writeConfig(cfg: RssConfig): Promise<void> {
  await redis.set(KEY, cfg);
}
