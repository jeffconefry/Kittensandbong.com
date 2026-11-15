/// <reference types="astro/client" />

// Secrets aren't in wrangler.jsonc, so `wrangler types` can't see them.
// Declared here; set them in the dashboard (production) or .dev.vars (local).
declare namespace Cloudflare {
  interface Env {
    PEXELS_API_KEY?: string;
    EMAIL_API_KEY?: string;
    TURNSTILE_SECRET_KEY?: string;
    ADMIN_TOKEN?: string;
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  readonly PUBLIC_TIP_URL?: string;
  readonly PUBLIC_SITE_INDEXABLE?: string;
}
