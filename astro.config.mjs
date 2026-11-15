// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Differences from the danielleroney.com playbook, on purpose:
// - No node adapter in dev. There's no Keystatic writing to disk here, and the
//   Cloudflare adapter runs `astro dev` inside workerd, so the D1 binding works locally.
// - Pages that show "today" render on demand (they read D1). Static pages
//   (privacy, 404) are prerendered with `export const prerender = true`.
export default defineConfig({
  site: 'https://kittensandbongs.com',
  output: 'server',
  trailingSlash: 'ignore',
  adapter: cloudflare({
    imageService: 'passthrough', // photos are served by Pexels' CDN, not resized here
  }),
  security: {
    // Off because mail apps' one-click unsubscribe POSTs without an Origin header.
    // Each POST route checks the origin itself where it matters (src/lib/guard.ts).
    checkOrigin: false,
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data: https://images.pexels.com",
        "frame-src https://challenges.cloudflare.com",
        "connect-src 'self' https://challenges.cloudflare.com",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
      ],
      scriptDirective: {
        resources: ["'self'", 'https://challenges.cloudflare.com'],
      },
    },
  },
});
