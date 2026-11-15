import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = () => {
  const indexable = import.meta.env.PUBLIC_SITE_INDEXABLE === 'true';
  const body = indexable
    ? ['User-agent: *', 'Disallow: /api/', 'Disallow: /confirm', 'Disallow: /unsubscribe', ''].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
