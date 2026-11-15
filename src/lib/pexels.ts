import type { Kind, Photo } from './db';

// Search terms per kind. One is picked at random each day for variety.
const QUERIES: Record<Kind, string[]> = {
  cat: ['kitten', 'cute kitten', 'cute cat', 'kitten playing', 'sleepy kitten', 'fluffy kitten'],
  bong: ['bong', 'glass bong', 'water pipe smoking'],
};

// Stock search is fuzzy ("bong" can match other things). Prefer results whose
// description actually mentions the subject. Cats fall back to any result
// (it's always a cat); bongs never do, so an off-topic photo can't slip in.
const MUST_MATCH: Record<Kind, RegExp> = {
  cat: /\b(cat|cats|kitten|kittens|kitty)\b/i,
  bong: /\b(bong|bongs|water ?pipe)\b/i,
};

const STRICT: Record<Kind, boolean> = { cat: false, bong: true };

const PER_PAGE = 80;
const MAX_PAGE = 10; // stay in the more relevant early pages

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  avg_color: string | null;
  alt: string | null;
  src: { medium: string; large: string; large2x: string };
}

interface SearchResult {
  total_results: number;
  photos: PexelsPhoto[];
}

async function search(apiKey: string, query: string, page: number): Promise<SearchResult> {
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', String(PER_PAGE));
  url.searchParams.set('page', String(page));
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Pexels search "${query}" p${page}: HTTP ${res.status}`);
  return res.json();
}

function toPhoto(kind: Kind, p: PexelsPhoto): Photo {
  return {
    pexels_id: p.id,
    kind,
    alt: (p.alt ?? '').trim() || (kind === 'cat' ? 'A cute cat' : 'A bong'),
    width: p.width,
    height: p.height,
    avg_color: p.avg_color,
    photographer: p.photographer,
    photographer_url: p.photographer_url,
    page_url: p.url,
    src_medium: p.src.medium,
    src_large: p.src.large,
    src_large2x: p.src.large2x,
  };
}

const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T>(xs: T[]): T[] => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x);

/**
 * Find a photo of `kind` that hasn't been used before.
 * `isUsed` gets a batch of candidate ids and returns the ones already in the database.
 */
export async function findFreshPhoto(
  apiKey: string,
  kind: Kind,
  isUsed: (ids: number[]) => Promise<Set<number>>,
): Promise<Photo> {
  for (const query of shuffle(QUERIES[kind])) {
    const first = await search(apiKey, query, 1);
    const pages = Math.min(MAX_PAGE, Math.ceil(first.total_results / PER_PAGE));
    if (pages === 0) continue;

    // Try a random page first, then walk the rest in order.
    const start = 1 + Math.floor(Math.random() * pages);
    const order = [start, ...Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p !== start)];

    for (const page of order.slice(0, 4)) {
      const result = page === 1 ? first : await search(apiKey, query, page);
      const used = await isUsed(result.photos.map((p) => p.id));
      const fresh = result.photos.filter((p) => !used.has(p.id));
      if (fresh.length === 0) continue;
      const relevant = fresh.filter((p) => MUST_MATCH[kind].test(p.alt ?? ''));
      if (relevant.length) return toPhoto(kind, pick(relevant));
      if (!STRICT[kind]) return toPhoto(kind, pick(fresh));
    }
  }
  throw new Error(`No unused ${kind} photo found on Pexels`);
}
