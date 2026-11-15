import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readForm, redirect, sameOrigin } from '../../lib/guard';
import { TOKEN_RE } from '../../lib/links';

// The emailed link opens /confirm, which posts here. Confirming on GET would let
// corporate link scanners "click" it and subscribe people who never confirmed.
export const POST: APIRoute = async ({ request }) => {
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });
  const form = await readForm(request);
  const token = String(form?.get('t') ?? '');
  if (!TOKEN_RE.test(token)) return redirect('/confirm?error=1');

  const row = await env.DB.prepare(
    `UPDATE subscribers
       SET status = 'active', confirmed_at = COALESCE(confirmed_at, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
     WHERE token = ? AND status IN ('pending', 'active')
     RETURNING id`,
  )
    .bind(token)
    .first();

  return redirect(row ? '/confirmed' : '/confirm?error=1');
};
