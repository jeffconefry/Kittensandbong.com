// Worker entry: Astro handles every request; the cron trigger runs the daily job.
import astro from '@astrojs/cloudflare/entrypoints/server';
import { runDaily } from './lib/daily';

export default {
  fetch: astro.fetch,

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      runDaily(env).then(
        (r) => console.log(`[cron] ${JSON.stringify(r)}`),
        (err) => {
          console.error(`[cron] failed: ${err instanceof Error ? err.stack : err}`);
          throw err; // marks the cron run as failed in the dashboard
        },
      ),
    );
  },
} satisfies ExportedHandler<Cloudflare.Env>;
