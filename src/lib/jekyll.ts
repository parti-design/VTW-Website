// Content written for Jekyll, rendered the way Jekyll rendered it.
//
// The content files are not changed by the move to Astro (the editor and the client
// work on them), so two Jekyll habits in them have to keep working:
//
//   1. Liquid inside the Markdown. Only what the content actually uses is supported:
//        {% include img.html src="..." alt="..." sizes="..." widths="..." %}
//        {% post_url 2025-06-07-hudson-valley-renovation-costs %}
//        {{ '/contact/' | relative_url }}
//      plus {%- -%} whitespace control. Anything else fails the build with the file
//      named, rather than printing Liquid to visitors.
//   2. kramdown, not CommonMark. HTML blocks run to their closing tag, blank lines and
//      all (the about, services and FAQ pages are one long HTML block each); headings
//      get kramdown's GFM ids; quotes are curled and -- is an en dash.
//
// New Parti sites write plain Markdown and use Astro's own render() instead.
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import type { Heading, Root } from 'mdast'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import remarkSmartypants from 'remark-smartypants'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import { datePath, parseJekyllDate } from './dates'
import { imgTag, SMALL } from './images'
import { site } from '../site.config'

// ── Liquid ────────────────────────────────────────────────────────────────────

const POSTS_DIR = '_posts'

/** Front matter of a Markdown file, without rendering it. */
function frontMatter(path: string): Record<string, unknown> {
  const text = readFileSync(path, 'utf8')
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  return m ? ((yaml.load(m[1]) as Record<string, unknown>) ?? {}) : {}
}

/** The URL of a post named by its file name, as {% post_url %} resolves it. */
export function postUrlFromFile(name: string, from: string): string {
  const path = join(process.cwd(), POSTS_DIR, `${name}.md`)
  if (!existsSync(path)) throw new Error(`${from}: {% post_url ${name} %} names no file in ${POSTS_DIR}/`)
  const data = frontMatter(path)
  // Jekyll only resolves published posts; a link to a parked one failed the build
  // there, and does here, so it cannot go live as a dead link.
  if (data.published === false) {
    throw new Error(`${from}: {% post_url ${name} %} links to a post that is not published`)
  }
  const m = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/)
  if (!m) throw new Error(`${from}: {% post_url ${name} %}: not a dated post file name`)
  const date = parseJekyllDate(data.date ?? m[1])
  return `/${datePath(date)}/${m[2]}/`
}

function includeArgs(args: string, from: string): Record<string, string> {
  const out: Record<string, string> = {}
  const rest = args.replace(/(\w+)=(?:"([^"]*)"|'([^']*)')/g, (_, k, dq, sq) => {
    out[k] = dq ?? sq
    return ''
  })
  if (rest.trim()) throw new Error(`${from}: unsupported include arguments: ${rest.trim()}`)
  return out
}

function includeImg(a: Record<string, string>): string {
  return imgTag({
    src: a.src,
    alt: a.alt,
    sizes: a.sizes,
    widths: a.widths ? a.widths.split(',').map(Number) : SMALL,
    class: a.class,
    loading: a.loading as 'lazy' | 'eager' | undefined,
    decoding: a.decoding as 'async' | 'sync' | 'auto' | undefined,
    fetchpriority: a.fetchpriority as 'high' | 'low' | 'auto' | undefined,
  })
}

/** Runs the Liquid that content files use. `from` names the file in errors. */
export function renderLiquid(text: string, from: string): string {
  // {%- and {{- swallow the whitespace before them, -%} and -}} the whitespace after.
  return text.replace(
    /(\s*)\{([%{])(-?)\s*([\s\S]*?)\s*(-?)([%}])\}(\s*)/g,
    (whole, before: string, open: string, trimL: string, inner: string, trimR: string, close: string, after: string) => {
      if ((open === '%') !== (close === '%')) throw new Error(`${from}: malformed Liquid: ${whole.trim()}`)
      let out: string
      if (open === '{') {
        const m = inner.match(/^(['"])(.*)\1\s*\|\s*(relative_url|absolute_url)$/)
        if (!m) throw new Error(`${from}: unsupported Liquid output: {{ ${inner} }}`)
        out = m[3] === 'absolute_url' ? site.url + m[2] : m[2]
      } else {
        const [tag, ...rest] = inner.split(/\s+/)
        const args = inner.slice(tag.length).trim()
        if (tag === 'include' && rest[0] === 'img.html') {
          out = includeImg(includeArgs(args.slice('img.html'.length), from))
        } else if (tag === 'post_url' && rest.length === 1) {
          out = postUrlFromFile(rest[0], from)
        } else {
          throw new Error(`${from}: unsupported Liquid tag: {% ${inner} %}`)
        }
      }
      return (trimL ? '' : before) + out + (trimR ? '' : after)
    },
  )
}

// ── Markdown, as kramdown ─────────────────────────────────────────────────────

// Elements kramdown treats as an HTML block when one starts a line. Inline elements
// (a, em, span, img...) start a paragraph instead, in both kramdown and CommonMark.
const BLOCK_TAGS = new Set(
  ('address article aside blockquote details dialog div dl dd dt fieldset figcaption figure ' +
    'footer form h1 h2 h3 h4 h5 h6 header hgroup hr iframe li main nav noscript ol p pre ' +
    'script section style summary table tbody thead tfoot tr td th ul video audio picture').split(' '),
)

/**
 * Lifts each top-level HTML block out of the Markdown, kramdown-style: from its opening
 * tag to the matching close, however many blank lines it contains. CommonMark would end
 * the block at the first blank line and read the indented HTML after it as a code
 * block. Each block is swapped for a comment, which CommonMark passes through whole.
 */
function liftHtmlBlocks(md: string): { md: string; blocks: string[] } {
  const lines = md.split('\n')
  const out: string[] = []
  const blocks: string[] = []
  let fence: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const f = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (f) fence = fence ? (f[1][0] === fence[0] ? null : fence) : f[1]
    if (fence) {
      out.push(line)
      continue
    }
    let end = -1
    if (/^ {0,3}<!--/.test(line)) {
      end = i
      while (end < lines.length && !lines[end].includes('-->')) end++
    } else {
      const open = line.match(/^ {0,3}<([a-zA-Z][a-zA-Z0-9]*)(?=[\s>/]|$)/)
      if (open && BLOCK_TAGS.has(open[1].toLowerCase())) {
        const tag = open[1]
        const opens = new RegExp(`<${tag}(?=[\\s>/])[^>]*?(/?)>`, 'gi')
        const closes = new RegExp(`</${tag}\\s*>`, 'gi')
        let depth = 0
        for (end = i; end < lines.length; end++) {
          for (const m of lines[end].matchAll(opens)) if (!m[1]) depth++
          depth -= [...lines[end].matchAll(closes)].length
          if (depth <= 0) break
        }
      }
    }
    if (end === -1) {
      out.push(line)
      continue
    }
    end = Math.min(end, lines.length - 1)
    blocks.push(lines.slice(i, end + 1).join('\n'))
    out.push('', `<!--vtw-html-block-${blocks.length - 1}-->`, '')
    i = end
  }
  return { md: out.join('\n'), blocks }
}

/**
 * kramdown's GFM heading ids: lower case, drop everything but word characters, hyphens
 * and spaces, spaces to hyphens, "-1", "-2" on repeats. Taken from the heading's
 * source text, as kramdown does.
 */
function kramdownHeadingIds(this: unknown) {
  return (tree: Root, file: { value: unknown }) => {
    const source = String(file.value)
    const seen = new Map<string, number>()
    visit(tree, 'heading', (node: Heading) => {
      const first = node.children[0]
      const last = node.children[node.children.length - 1]
      if (!first?.position || !last?.position) return
      const raw = source.slice(first.position.start.offset, last.position.end.offset)
      let id = raw.toLowerCase().replace(/[^\p{L}\p{M}\p{Nd}\p{Pc}\- \t]/gu, '').replace(/[ \t]/g, '-')
      const n = seen.get(id) ?? -1
      seen.set(id, n + 1)
      if (n + 1 > 0) id += `-${n + 1}`
      node.data = { ...node.data, hProperties: { ...(node.data?.hProperties ?? {}), id } }
    })
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(kramdownHeadingIds)
  // kramdown: -- is an en dash and --- an em dash ("oldschool"); quotes curled.
  .use(remarkSmartypants, { dashes: 'oldschool' })
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true })

/** Markdown (already through Liquid) to HTML, the way kramdown would have. */
export function markdownify(md: string): string {
  const { md: lifted, blocks } = liftHtmlBlocks(md)
  const html = String(processor.processSync(lifted))
  return html.replace(/<!--vtw-html-block-(\d+)-->/g, (_, n) => blocks[Number(n)])
}

const cache = new Map<string, string>()

/** A content file's body as HTML: its Liquid run, then its Markdown rendered. */
export function renderBody(entry: { filePath?: string; body?: string; id: string }): string {
  const from = entry.filePath ?? entry.id
  const key = `${from}\0${entry.body ?? ''}`
  let html = cache.get(key)
  if (html === undefined) {
    const body = entry.body ?? ''
    html = body.trim() ? markdownify(renderLiquid(body, from)).trim() : ''
    cache.set(key, html)
  }
  return html
}

// ── Text helpers that jekyll-seo-tag and jekyll-feed apply ────────────────────

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“',
  hellip: '…', middot: '·', rarr: '→', larr: '←', copy: '©',
}

/** Turns HTML entities into the characters they stand for. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (whole, e: string) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
    return ENTITIES[e.toLowerCase()] ?? whole
  })
}

export const stripHtml = (s: string) => s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>/g, '')
export const normalizeWhitespace = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * A front matter string the way jekyll-seo-tag prints it: through kramdown (so quotes
 * curl), tags stripped, whitespace collapsed. Returned as plain text; Astro escapes it.
 */
export function plainText(s: string | undefined | null): string | undefined {
  if (s == null) return undefined
  const text = decodeEntities(normalizeWhitespace(stripHtml(markdownify(String(s)))))
  return text || undefined
}
