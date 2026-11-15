import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { runDaily } from '../../../lib/daily';
import { safeEqual } from '../../../lib/guard';

// Runs the daily job now, ignoring SEND_HOUR. For testing and recovery:
//   curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://kittensandbongs.com/api/admin/run
export const POST: APIRoute = async ({ request }) => {
  const auth = request.headers.get('Authorization') ?? '';
  const expected = env.ADMIN_TOKEN;
  if (!expected || expected.length < 24 || !safeEqual(auth, `Bearer ${expected}`)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const result = await runDaily(env, { force: true });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
};
