// The resized-copy naming contract. Content names one image (the original); the build
// never resizes anything, it only works out where the smaller copies live and writes
// them into srcset. Two conventions are in use:
//
//   Local photographs, resized by tools/build-images.py into a mirror tree:
//     /assets/images/projects-final/f-s-barn/54-07-68.jpg
//     /assets/images/derived/projects-final/f-s-barn/54-07-68-800.webp
//
//   Everything else (Grove uploads in /assets/images/uploads/, and the media library at
//   https://media.parti.design/), copies stored next to the file, same format:
//     https://media.parti.design/vtw/barn.jpg
//     https://media.parti.design/vtw/barn-800.jpg
//
// The original stays the <img src>: it is the fallback, and it is what the lightbox
// opens, since clicking a photo is a request to see it properly.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Cards and gallery thumbnails. Every local photograph has these. */
export const SMALL = [400, 800] as const
/** Anything shown large: covers, the home page panels, the about and services photos. */
export const LARGE = [400, 800, 1200, 1600] as const

const LOCAL = '/assets/images/'
const DERIVED = '/assets/images/derived/'
const UPLOADS = '/assets/images/uploads/'

const isRemote = (src: string) => /^https?:\/\//.test(src)

/** The URL of the `width`-pixel copy of `src`, or null when the contract says there is none. */
export function variantUrl(src: string, width: number): string | null {
  if (isRemote(src) || src.startsWith(UPLOADS)) {
    const [path, query = ''] = src.split(/(?=[?#])/)
    if (!/\.\w+$/.test(path)) return null
    return path.replace(/\.(\w+)$/, `-${width}.$1`) + query
  }
  if (src.startsWith(LOCAL)) {
    return DERIVED + src.slice(LOCAL.length).replace(/\.(jpe?g|png)$/i, '') + `-${width}.webp`
  }
  return null
}

// Local copies are checked on disk, so a photograph added without running
// tools/build-images.py falls back to its original instead of a broken srcset. Remote
// copies cannot be checked without fetching them; the media library makes them on
// upload, so they are trusted.
const missing = new Set<string>()
function exists(url: string): boolean {
  if (isRemote(url)) return true
  if (existsSync(join(process.cwd(), url))) return true
  if (!missing.has(url)) {
    missing.add(url)
    console.warn(`[images] missing resized copy ${url} (run tools/build-images.py); serving the original`)
  }
  return false
}

/** srcset for `src` at `widths`, or undefined when any copy is missing. */
export function srcset(src: string, widths: readonly number[]): string | undefined {
  const urls = widths.map((w) => [variantUrl(src, w), w] as const)
  if (urls.some(([u]) => !u || !exists(u))) return undefined
  return urls.map(([u, w]) => `${u} ${w}w`).join(', ')
}

export interface ImgProps {
  src: string
  alt?: string
  /** The CSS `sizes` attribute. Pass it: without it the browser assumes 100vw. */
  sizes?: string
  /** Which copies exist: SMALL for cards and thumbnails, LARGE for anything shown big. */
  widths?: readonly number[]
  class?: string
  loading?: 'lazy' | 'eager'
  decoding?: 'async' | 'sync' | 'auto'
  fetchpriority?: 'high' | 'low' | 'auto'
  /** Anything else for the tag, an editor label say. */
  attrs?: Record<string, string>
}

const escapeAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * The <img> tag, as a string. The one place a photograph's markup is written: the Img
 * component prints it, and so does the {% include img.html %} that page bodies use.
 */
export function imgTag(p: ImgProps): string {
  const attrs: [string, string | undefined][] = [
    ['src', p.src],
    ['srcset', srcset(p.src, p.widths ?? SMALL)],
    ['sizes', p.sizes ?? '100vw'],
    ['alt', p.alt ?? ''],
    ['class', p.class],
    ['loading', p.loading ?? 'lazy'],
    ['decoding', p.decoding ?? 'async'],
    ['fetchpriority', p.fetchpriority],
    ...Object.entries(p.attrs ?? {}),
  ]
  return `<img${attrs
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (v === '' && k.startsWith('data-') ? ` ${k}` : ` ${k}="${escapeAttr(v!)}"`))
    .join('')} />`
}

/**
 * The three sizes a CSS background panel picks between by viewport (brand.css reads
 * --bg-sm, --bg-md and --bg-lg). Falls back to the original for any missing size.
 */
export function backgroundVars(src: string): string {
  const pick = (w: number) => {
    const u = variantUrl(src, w)
    return u && exists(u) ? u : src
  }
  return `--bg-sm: url('${pick(800)}'); --bg-md: url('${pick(1200)}'); --bg-lg: url('${pick(1600)}');`
}
