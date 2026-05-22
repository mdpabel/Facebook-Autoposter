import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'rss-config.json');

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

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readConfig(): RssConfig {
  ensure();
  if (!fs.existsSync(FILE)) return { ...DEFAULT_CONFIG };
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}

export function writeConfig(cfg: RssConfig) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(cfg, null, 2));
}
