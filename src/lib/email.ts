// Email sending, behind one small interface so the provider can change
// without touching the rest of the site. Check the provider's acceptable use
// policy for cannabis-adjacent content BEFORE building a list on it.
//
// EMAIL_PROVIDER:
//   "log"    – doesn't send; prints to the Worker log (default, for testing)
//   "resend" – Resend HTTP API (batch endpoint, up to 100 messages per call)
// To add another provider, add a case to sendBatch().

export interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
}

export interface EmailEnv {
  EMAIL_PROVIDER: string;
  EMAIL_FROM: string;
  EMAIL_API_KEY?: string;
}

export const BATCH_SIZE = 100;

export async function sendBatch(env: EmailEnv, messages: Message[]): Promise<void> {
  if (messages.length === 0) return;
  if (messages.length > BATCH_SIZE) throw new Error(`sendBatch: max ${BATCH_SIZE} messages`);

  switch (env.EMAIL_PROVIDER) {
    case 'log': {
      for (const m of messages) console.log(`[email:log] to=${m.to} subject="${m.subject}"`);
      return;
    }
    case 'resend': {
      if (!env.EMAIL_API_KEY) throw new Error('EMAIL_API_KEY is not set');
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          messages.map((m) => ({
            from: env.EMAIL_FROM,
            to: [m.to],
            subject: m.subject,
            html: m.html,
            text: m.text,
            headers: m.headers,
          })),
        ),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Resend: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      return;
    }
    default:
      throw new Error(`Unknown EMAIL_PROVIDER "${env.EMAIL_PROVIDER}"`);
  }
}

export async function sendOne(env: EmailEnv, message: Message): Promise<void> {
  return sendBatch(env, [message]);
}
