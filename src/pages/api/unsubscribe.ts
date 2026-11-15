import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { readForm, redirect } from '../../lib/guard';
import { TOKEN_RE } from '../../lib/links';

// Two callers:
//  - the button on /unsubscribe (form field "t")
//  - mail apps' one-click unsubscribe (RFC 8058): POST to ?t=… with body
//    "List-Unsubscribe=One-Click" and no Origin header. So no origin check here;
//    the token itself is the permission, and all it can do is unsubscribe.
export const POST: APIRoute = async ({ request, url }) => {
  const form = await readForm(request);
  const token = url.searchParams.get('t') ?? String(form?.get('t') ?? '');
  const oneClick = form?.get('List-Unsubscribe') === 'One-Click';

  if (TOKEN_RE.test(token)) {
    await env.DB.prepare(
      `UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
       WHERE token = ? AND status != 'unsubscribed'`,
    )
      .bind(token)
      .run();
  }

  // Same answer whether or not the token matched.
  return oneClick ? new Response('Unsubscribed', { status: 200 }) : redirect('/unsubscribed');
};
