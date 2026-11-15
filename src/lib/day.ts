// The site runs on New York time: a "day" is an America/New_York calendar date.
const TZ = 'America/New_York';

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const hourFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' });

/** YYYY-MM-DD in New York. */
export function nyDay(at: Date = new Date()): string {
  return dateFmt.format(at); // en-CA formats as YYYY-MM-DD
}

/** Hour 0–23 in New York. */
export function nyHour(at: Date = new Date()): number {
  return Number(hourFmt.format(at));
}

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "Saturday, November 14, 2026" for a YYYY-MM-DD string. */
export function longDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
