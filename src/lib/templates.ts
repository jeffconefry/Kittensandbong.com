import type { DayPair, Photo } from './db';
import { longDate } from './day';

export const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

interface Links {
  siteUrl: string;
  unsubscribeUrl: string;
  postalAddress: string;
}

function footerHtml({ siteUrl, unsubscribeUrl, postalAddress }: Links) {
  return `
  <tr><td style="padding:24px 8px 8px;font:13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8a7f73;text-align:center">
    You're getting this because you signed up at <a href="${esc(siteUrl)}" style="color:#8a7f73">kittensandbongs.com</a>.
    For adults 21+. Humor only, nothing for sale.<br>
    Photos provided by <a href="https://www.pexels.com" style="color:#8a7f73">Pexels</a>.<br>
    <a href="${esc(unsubscribeUrl)}" style="color:#8a7f73">Unsubscribe</a>
    ${postalAddress ? `<br>${esc(postalAddress)}` : ''}
  </td></tr>`;
}

function footerText({ siteUrl, unsubscribeUrl, postalAddress }: Links) {
  return [
    '',
    '--',
    `You're getting this because you signed up at ${siteUrl}. For adults 21+.`,
    'Photos provided by Pexels (https://www.pexels.com).',
    `Unsubscribe: ${unsubscribeUrl}`,
    postalAddress,
  ]
    .filter((l) => l !== undefined)
    .join('\n');
}

function photoBlock(p: Photo, label: string) {
  return `
  <tr><td style="padding:16px 8px 4px;font:600 13px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#b4553a">${label}</td></tr>
  <tr><td style="padding:4px 8px">
    <img src="${esc(p.src_large)}" alt="${esc(p.alt)}" width="584" style="display:block;width:100%;max-width:584px;height:auto;border-radius:14px;background:${esc(p.avg_color ?? '#eee')}">
  </td></tr>
  <tr><td style="padding:2px 8px 0;font:12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8a7f73">
    Photo by <a href="${esc(p.photographer_url)}" style="color:#8a7f73">${esc(p.photographer)}</a> on <a href="${esc(p.page_url)}" style="color:#8a7f73">Pexels</a>
  </td></tr>`;
}

function shell(inner: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#fbf6ee">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf6ee"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
${inner}
</table></td></tr></table></body></html>`;
}

export function dailyEmail(pair: DayPair, links: Links) {
  const date = longDate(pair.day);
  const html = shell(`
  <tr><td style="padding:0 8px 4px;font:700 28px/1.1 Georgia,serif;color:#2b2420">Kittens &amp; Bongs</td></tr>
  <tr><td style="padding:0 8px;font:14px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8a7f73">${esc(date)}</td></tr>
  ${photoBlock(pair.cat, 'Today’s kitten')}
  ${photoBlock(pair.bong, 'Today’s bong')}
  <tr><td style="padding:20px 8px 0;font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2b2420">
    <a href="${esc(links.siteUrl)}" style="color:#b4553a">See it on the site</a>
  </td></tr>
  ${footerHtml(links)}`);
  const text = [
    `Kittens & Bongs — ${date}`,
    '',
    `Today's kitten: ${pair.cat.src_large}`,
    `  Photo by ${pair.cat.photographer} on Pexels`,
    '',
    `Today's bong: ${pair.bong.src_large}`,
    `  Photo by ${pair.bong.photographer} on Pexels`,
    footerText(links),
  ].join('\n');
  return { subject: `Kittens & Bongs · ${date}`, html, text };
}

export function confirmEmail(confirmUrl: string, links: Links) {
  const html = shell(`
  <tr><td style="padding:0 8px 12px;font:700 28px/1.1 Georgia,serif;color:#2b2420">One click and you're in</td></tr>
  <tr><td style="padding:0 8px;font:16px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2b2420">
    Confirm your email to get one kitten and one bong every morning.
  </td></tr>
  <tr><td style="padding:20px 8px">
    <a href="${esc(confirmUrl)}" style="display:inline-block;background:#b4553a;color:#fff;text-decoration:none;font:600 16px/1 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;padding:14px 22px;border-radius:999px">Confirm subscription</a>
  </td></tr>
  <tr><td style="padding:0 8px;font:13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#8a7f73">
    Didn't sign up? Ignore this email and nothing happens.
  </td></tr>
  ${footerHtml(links)}`);
  const text = [
    'Confirm your email to get one kitten and one bong every morning:',
    confirmUrl,
    '',
    "Didn't sign up? Ignore this email and nothing happens.",
    footerText(links),
  ].join('\n');
  return { subject: 'Confirm your Kittens & Bongs subscription', html, text };
}
