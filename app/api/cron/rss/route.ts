import { NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { runAutomation } from '@/lib/automation';

export const runtime = 'nodejs';

const LIVE_URL = 'https://fb.mdpabel.com/api/cron/rss';

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  // Upstash QStash signature verification (production)
  if (currentKey && nextKey) {
    const signature = req.headers.get('Upstash-Signature');
    if (!signature) return false;
    try {
      const receiver = new Receiver({ currentSigningKey: currentKey, nextSigningKey: nextKey });
      const body = await req.text();
      return await receiver.verify({ signature, body, url: LIVE_URL });
    } catch {
      return false;
    }
  }

  // Fallback: plain Bearer token for local dev / other schedulers
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    return req.headers.get('authorization') === `Bearer ${cronSecret}`;
  }

  // No secrets configured — allow in dev, warn loudly
  console.warn('[cron/rss] No QSTASH keys or CRON_SECRET set — endpoint is unprotected');
  return true;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runAutomation();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

// Also accept GET for manual curl testing in dev
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const summary = await runAutomation();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
