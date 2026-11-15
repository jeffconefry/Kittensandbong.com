export type Kind = 'cat' | 'bong';

export interface Photo {
  pexels_id: number;
  kind: Kind;
  alt: string;
  width: number | null;
  height: number | null;
  avg_color: string | null;
  photographer: string;
  photographer_url: string;
  page_url: string;
  src_medium: string;
  src_large: string;
  src_large2x: string;
}

export interface DayPair {
  day: string;
  cat: Photo;
  bong: Photo;
}

const PHOTO_COLS = `pexels_id, kind, alt, width, height, avg_color, photographer, photographer_url,
  page_url, src_medium, src_large, src_large2x`;

async function photo(db: D1Database, id: number): Promise<Photo | null> {
  return db
    .prepare(`SELECT ${PHOTO_COLS} FROM photos WHERE pexels_id = ? AND blocked = 0`)
    .bind(id)
    .first<Photo>();
}

async function hydrate(db: D1Database, row: { day: string; cat_id: number; bong_id: number } | null) {
  if (!row) return null;
  const [cat, bong] = await Promise.all([photo(db, row.cat_id), photo(db, row.bong_id)]);
  if (!cat || !bong) return null; // a blocked photo hides the whole day
  return { day: row.day, cat, bong } satisfies DayPair;
}

/** The newest published day on or before `day`. */
export async function latestDay(db: D1Database, day: string): Promise<DayPair | null> {
  const row = await db
    .prepare(
      `SELECT d.day, d.cat_id, d.bong_id FROM days d
       JOIN photos c ON c.pexels_id = d.cat_id AND c.blocked = 0
       JOIN photos b ON b.pexels_id = d.bong_id AND b.blocked = 0
       WHERE d.day <= ? ORDER BY d.day DESC LIMIT 1`,
    )
    .bind(day)
    .first<{ day: string; cat_id: number; bong_id: number }>();
  return hydrate(db, row);
}

export async function getDay(db: D1Database, day: string): Promise<DayPair | null> {
  const row = await db
    .prepare('SELECT day, cat_id, bong_id FROM days WHERE day = ?')
    .bind(day)
    .first<{ day: string; cat_id: number; bong_id: number }>();
  return hydrate(db, row);
}

export interface ArchiveRow {
  day: string;
  cat_src: string;
  cat_alt: string;
  bong_src: string;
  bong_alt: string;
}

export async function archive(db: D1Database, beforeOrOn: string, limit = 60): Promise<ArchiveRow[]> {
  const { results } = await db
    .prepare(
      `SELECT d.day, c.src_medium AS cat_src, c.alt AS cat_alt, b.src_medium AS bong_src, b.alt AS bong_alt
       FROM days d
       JOIN photos c ON c.pexels_id = d.cat_id AND c.blocked = 0
       JOIN photos b ON b.pexels_id = d.bong_id AND b.blocked = 0
       WHERE d.day <= ? ORDER BY d.day DESC LIMIT ?`,
    )
    .bind(beforeOrOn, limit)
    .all<ArchiveRow>();
  return results;
}
