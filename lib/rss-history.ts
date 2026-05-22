import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'rss-history.json');

export type HistoryEntry = {
  id: string;
  title: string;
  fbPostId?: string;
  status: 'posted' | 'skipped' | 'failed';
  timestamp: string;
};

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readHistory(): HistoryEntry[] {
  ensure();
  if (!fs.existsSync(FILE)) return [];
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

export function writeHistory(entries: HistoryEntry[]) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(entries, null, 2));
}

export function appendHistory(entry: HistoryEntry) {
  const h = readHistory();
  h.unshift(entry);
  writeHistory(h.slice(0, 200));
}

export function isPosted(id: string): boolean {
  return readHistory().some((e) => e.id === id && e.status === 'posted');
}
