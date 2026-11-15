// Request checks for form endpoints (same ideas as danielleroney.com's api/contact.ts,
// with the audit fixes applied from the start).

/** The Origin header must be present and match this site. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

/** Reads a small urlencoded/multipart form; null if it's too big or malformed. */
export async function readForm(request: Request, maxBytes = 4096): Promise<FormData | null> {
  const len = Number(request.headers.get('Content-Length') ?? '0');
  if (len > maxBytes) return null;
  try {
    const text = await request.text();
    if (text.length > maxBytes) return null;
    const type = request.headers.get('Content-Type') ?? '';
    if (type.includes('application/x-www-form-urlencoded')) {
      const form = new FormData();
      for (const [k, v] of new URLSearchParams(text)) form.append(k, v);
      return form;
    }
    return await new Response(text, { headers: { 'Content-Type': type } }).formData();
  } catch {
    return null;
  }
}

/**
 * Verifies a Turnstile token. In production a missing secret means "refuse":
 * a public signup form without a bot check gets abused fast.
 */
export async function turnstileOk(
  secret: string | undefined,
  token: string,
  ip: string | null,
  isProd: boolean,
): Promise<boolean> {
  if (!secret) return !isProd;
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

/** Constant-time string comparison for the admin token. */
export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;

export const redirect = (to: string) => new Response(null, { status: 303, headers: { Location: to } });
