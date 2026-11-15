import { defineMiddleware } from 'astro:middleware';

// Security headers for on-demand responses (static files get the same set from public/_headers).
const HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const response = await next();
  for (const [k, v] of Object.entries(HEADERS)) {
    if (!response.headers.has(k)) response.headers.set(k, v);
  }
  if (import.meta.env.PUBLIC_SITE_INDEXABLE !== 'true') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
});
