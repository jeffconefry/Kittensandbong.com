import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { EMAIL_RE, readForm, redirect, sameOrigin, turnstileOk } from '../../lib/guard';
import { sendOne } from '../../lib/email';
import { confirmEmail } from '../../lib/templates';
import { confirmUrl, newToken, unsubscribePageUrl } from '../../lib/links';

const RESEND_AFTER_MS = 10 * 60 * 1000; // don't re-send a confirm email more often than this
const MIN_FILL_MS = 3000;
const MAX_FILL_MS = 24 * 60 * 60 * 1000;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });

  const form = await readForm(request);
  if (!form) return redirect('/?signup=invalid#signup');

  // Bots: honeypot filled, or the form was submitted implausibly fast/slow.
  // Pretend it worked so they learn nothing.
  const started = Number(form.get('ts'));
  const elapsed = Date.now() - started;
  if (String(form.get('website') ?? '') !== '' || !(elapsed >= MIN_FILL_MS && elapsed <= MAX_FILL_MS)) {
    return redirect('/check-email');
  }

  const human = await turnstileOk(
    env.TURNSTILE_SECRET_KEY,
    String(form.get('cf-turnstile-response') ?? ''),
    clientAddress ?? null,
    import.meta.env.PROD,
  );
  if (!human) return redirect('/?signup=verify#signup');

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return redirect('/?signup=invalid#signup');

  const existing = await env.DB.prepare(
    'SELECT id, status, token, confirm_sent_at FROM subscribers WHERE email = ?',
  )
    .bind(email)
    .first<{ id: number; status: string; token: string; confirm_sent_at: string | null }>();

  let token: string | null = null;

  if (!existing) {
    token = newToken();
    await env.DB.prepare('INSERT INTO subscribers (email, token) VALUES (?, ?)').bind(email, token).run();
  } else if (existing.status === 'unsubscribed') {
    token = newToken();
    await env.DB.prepare(
      "UPDATE subscribers SET status = 'pending', token = ?, unsubscribed_at = NULL WHERE id = ?",
    )
      .bind(token, existing.id)
      .run();
  } else if (existing.status === 'pending') {
    const last = existing.confirm_sent_at ? Date.parse(existing.confirm_sent_at) : 0;
    if (Date.now() - last > RESEND_AFTER_MS) token = existing.token;
  }
  // 'active': already subscribed. Same response as everyone else, no email.

  if (token) {
    const links = {
      siteUrl: env.SITE_URL,
      unsubscribeUrl: unsubscribePageUrl(env.SITE_URL, token),
      postalAddress: env.POSTAL_ADDRESS ?? '',
    };
    try {
      await sendOne(env, { to: email, ...confirmEmail(confirmUrl(env.SITE_URL, token), links) });
      await env.DB.prepare("UPDATE subscribers SET confirm_sent_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE email = ?")
        .bind(email)
        .run();
    } catch (err) {
      console.error(`[subscribe] confirm email failed: ${err instanceof Error ? err.message : err}`);
      return redirect('/?signup=error#signup');
    }
  }

  return redirect('/check-email');
};
