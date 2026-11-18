// Dates the way the Jekyll site printed them. GitHub Pages built in UTC, so every
// date on the old site, in URLs, <time> and feeds, is the UTC reading of the front
// matter. Keeping that makes every post URL and timestamp come out identical.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Front matter dates as Jekyll reads them. YAML only turns ISO timestamps into dates,
 * so "2025-08-29 08:40:00 -0400" (Jekyll's own format) arrives as a string. A date
 * without an offset is UTC, as on GitHub Pages.
 */
export function parseJekyllDate(value: unknown): Date {
  if (value instanceof Date) return value
  const m = String(value).trim().match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i,
  )
  if (!m) throw new Error(`Not a date Jekyll would read: ${JSON.stringify(value)}`)
  const [, y, mo, d, h = '0', mi = '0', s = '0', zone] = m
  let offsetMinutes = 0
  if (zone && zone.toUpperCase() !== 'Z') {
    const z = zone.replace(':', '')
    offsetMinutes = (z[0] === '-' ? -1 : 1) * (Number(z.slice(1, 3)) * 60 + Number(z.slice(3, 5)))
  }
  return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - offsetMinutes * 60_000)
}

/** Liquid's date_to_xmlschema on GitHub Pages: 2025-08-29T12:40:00+00:00 */
export function xmlschema(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

/** Liquid's date: "%B %-d, %Y": August 29, 2025 */
export function longDate(d: Date): string {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

/** The /:year/:month/:day/ part of a post URL. */
export function datePath(d: Date): string {
  return `${d.getUTCFullYear()}/${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}`
}

/** When this build ran. Feeds and sitemaps print it where Jekyll printed site.time. */
export const buildTime = new Date(Math.floor(Date.now() / 1000) * 1000)
