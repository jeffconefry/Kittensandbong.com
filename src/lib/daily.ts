// The daily job. Called hourly by the cron trigger (src/worker.ts) and by
// POST /api/admin/run. Safe to run any number of times:
//   1. Before SEND_HOUR (New York time) it does nothing.
//   2. It picks today's kitten + bong once (the `days` row is the lock).
//   3. It emails active subscribers who haven't had today's email yet, in
//      batches, recording each batch. A failure just resumes next hour.
import { getDay, type Kind, type Photo } from './db';
import { nyDay, nyHour } from './day';
import { BATCH_SIZE, sendBatch, type Message } from './email';
import { findFreshPhoto } from './pexels';
import { dailyEmail } from './templates';
import { unsubscribeApiUrl, unsubscribePageUrl } from './links';

// Keeps one run well inside the Workers Free plan subrequest limit (50 per invocation).
// 5 x 100 = 500 emails per hourly run; anyone left over gets theirs next hour.
const MAX_BATCHES_PER_RUN = 5;

export interface DailyResult {
  day: string;
  status: 'waiting' | 'published' | 'already-published' | 'hidden';
  sent: number;
  remaining: number;
}

async function usedIds(db: D1Database, ids: number[]): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const { results } = await db
    .prepare(`SELECT pexels_id FROM photos WHERE pexels_id IN (${ids.map(() => '?').join(',')})`)
    .bind(...ids)
    .all<{ pexels_id: number }>();
  return new Set(results.map((r) => r.pexels_id));
}

function insertPhoto(db: D1Database, p: Photo) {
  return db
    .prepare(
      `INSERT OR IGNORE INTO photos (pexels_id, kind, alt, width, height, avg_color, photographer,
        photographer_url, page_url, src_medium, src_large, src_large2x)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(p.pexels_id, p.kind, p.alt, p.width, p.height, p.avg_color, p.photographer,
      p.photographer_url, p.page_url, p.src_medium, p.src_large, p.src_large2x);
}

async function publish(env: Cloudflare.Env, day: string): Promise<boolean> {
  const exists = await env.DB.prepare('SELECT 1 FROM days WHERE day = ?').bind(day).first();
  if (exists) return false;
  if (!env.PEXELS_API_KEY) throw new Error('PEXELS_API_KEY is not set');

  const find = (kind: Kind) => findFreshPhoto(env.PEXELS_API_KEY!, kind, (ids) => usedIds(env.DB, ids));
  const [cat, bong] = await Promise.all([find('cat'), find('bong')]);

  await env.DB.batch([
    insertPhoto(env.DB, cat),
    insertPhoto(env.DB, bong),
    env.DB.prepare('INSERT OR IGNORE INTO days (day, cat_id, bong_id) VALUES (?, ?, ?)').bind(day, cat.pexels_id, bong.pexels_id),
  ]);
  console.log(`[daily] ${day}: cat ${cat.pexels_id}, bong ${bong.pexels_id}`);
  return true;
}

export async function runDaily(env: Cloudflare.Env, opts: { now?: Date; force?: boolean } = {}): Promise<DailyResult> {
  const now = opts.now ?? new Date();
  const day = nyDay(now);

  if (!opts.force && nyHour(now) < Number(env.SEND_HOUR ?? 7)) {
    return { day, status: 'waiting', sent: 0, remaining: 0 };
  }

  const created = await publish(env, day);
  const pair = await getDay(env.DB, day);
  if (!pair) {
    // A photo was blocked after publishing. Don't email a half-empty day.
    console.warn(`[daily] ${day}: a photo is blocked; not sending`);
    return { day, status: 'hidden', sent: 0, remaining: 0 };
  }

  const links = { siteUrl: env.SITE_URL, postalAddress: env.POSTAL_ADDRESS ?? '' };
  let sent = 0;

  for (let i = 0; i < MAX_BATCHES_PER_RUN; i++) {
    const { results: subs } = await env.DB.prepare(
      `SELECT id, email, token FROM subscribers
       WHERE status = 'active' AND (last_sent_day IS NULL OR last_sent_day < ?)
       ORDER BY id LIMIT ?`,
    )
      .bind(day, BATCH_SIZE)
      .all<{ id: number; email: string; token: string }>();
    if (subs.length === 0) break;

    const messages: Message[] = subs.map((s) => {
      const email = dailyEmail(pair, { ...links, unsubscribeUrl: unsubscribePageUrl(env.SITE_URL, s.token) });
      return {
        to: s.email,
        ...email,
        headers: {
          'List-Unsubscribe': `<${unsubscribeApiUrl(env.SITE_URL, s.token)}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });

    await sendBatch(env, messages);
    await env.DB.prepare(
      `UPDATE subscribers SET last_sent_day = ? WHERE id IN (${subs.map(() => '?').join(',')})`,
    )
      .bind(day, ...subs.map((s) => s.id))
      .run();
    sent += subs.length;
  }

  const left = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM subscribers WHERE status = 'active' AND (last_sent_day IS NULL OR last_sent_day < ?)`,
  )
    .bind(day)
    .first<{ n: number }>();

  if (sent) console.log(`[daily] ${day}: sent ${sent}, remaining ${left?.n ?? 0}`);
  return { day, status: created ? 'published' : 'already-published', sent, remaining: left?.n ?? 0 };
}
