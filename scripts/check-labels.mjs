// Checks the built site against the visual editor's contract. Run after `pnpm build`:
//
//   pnpm check:labels
//
// - edit.json parses, each `editable` glob matches files, each collection's folder
//   exists and every file in it has a built page at the collection's URL pattern;
// - every data-edit label in dist/ names a file that exists and that edit.json lets
//   the editor write, and a field that exists in it: the Markdown body, or a key in the
//   front matter (a missing key is fine only on a label marked data-edit-optional);
// - choice labels offer the same options as edit.json's field.
//
// Exits 1 with the problems listed, 0 with a count.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import yaml from 'js-yaml'

const root = process.cwd()
const dist = join(root, 'dist')
const problems = []
if (!existsSync(dist)) {
  console.error('No dist/ here: run `pnpm build` first.')
  process.exit(1)
}

// ── edit.json ─────────────────────────────────────────────────────────────────
const manifest = JSON.parse(readFileSync(join(root, 'edit.json'), 'utf8'))
const globRe = (g) => new RegExp('^' + g.split('**').map((p) => p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$')
const editable = manifest.editable.map(globRe)
const media = (manifest.media ?? 'assets/uploads').replace(/^\/+|\/+$/g, '')

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (name.startsWith('.') || name === 'node_modules' || name === 'dist') return []
    return statSync(p).isDirectory() ? walk(p) : [relative(root, p)]
  })
}
const repoFiles = walk(root).filter((f) => !f.startsWith('assets/'))
for (const [i, re] of editable.entries()) {
  if (!repoFiles.some((f) => re.test(f))) problems.push(`edit.json: editable "${manifest.editable[i]}" matches no file`)
}
const fieldsByFolder = {}
for (const [name, c] of Object.entries(manifest.modules?.collections ?? {})) {
  if (!existsSync(join(root, c.folder))) {
    problems.push(`edit.json: collection ${name}: folder ${c.folder} does not exist`)
    continue
  }
  fieldsByFolder[c.folder] = Object.fromEntries(c.fields.map((f) => [f.name, f]))
  for (const file of readdirSync(join(root, c.folder)).filter((f) => f.endsWith('.md'))) {
    const url = c.url.replace('{slug}', file.replace(/\.md$/, ''))
    if (!existsSync(join(dist, url, 'index.html'))) problems.push(`edit.json: collection ${name}: ${c.folder}/${file} has no page at ${url}`)
  }
}

// ── Labels in the built pages ─────────────────────────────────────────────────
const parsed = new Map()
function readContent(file) {
  if (!parsed.has(file)) {
    const text = readFileSync(join(root, file), 'utf8')
    if (/\.(md|markdown|html)$/.test(file)) {
      const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
      parsed.set(file, { data: m ? yaml.load(m[1]) ?? {} : {}, body: m ? m[2] : text, hasBody: true })
    } else if (/\.ya?ml$/.test(file)) parsed.set(file, { data: yaml.load(text), hasBody: false })
    else if (/\.json$/.test(file)) parsed.set(file, { data: JSON.parse(text), hasBody: false })
    else parsed.set(file, { data: undefined, hasBody: false })
  }
  return parsed.get(file)
}
function resolvePointer(data, pointer) {
  let cur = data
  for (const raw of pointer.split('/').slice(1)) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~')
    if (cur == null || typeof cur !== 'object' || !(key in cur)) return { found: false }
    cur = cur[key]
  }
  return { found: true, value: cur }
}
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}(?:="([^"]*)")?(?=[\\s>/])`))
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

let labels = 0
const pages = walk(dist).filter((f) => f.endsWith('.html'))
for (const page of pages) {
  const html = readFileSync(join(root, page), 'utf8')
  for (const [tag] of html.matchAll(/<[a-z][a-z0-9]*\s[^>]*data-edit="[^"]*"[^>]*>/gi)) {
    labels++
    const address = decode(attr(tag, 'data-edit')[1])
    const where = `${page.replace(/^dist\//, '/').replace(/index\.html$/, '')}: ${address}`
    const [file, pointer] = address.split('#')
    if (!file || pointer === undefined) { problems.push(`${where}: not file#pointer`); continue }
    if (!existsSync(join(root, file))) { problems.push(`${where}: no such file`); continue }
    if (!editable.some((re) => re.test(file)) && !file.startsWith(media + '/')) problems.push(`${where}: edit.json does not let the editor write ${file}`)
    const content = readContent(file)
    if (pointer === 'body') {
      if (!content.hasBody) problems.push(`${where}: ${file} has no Markdown body`)
    } else if (!pointer.startsWith('/')) {
      problems.push(`${where}: pointer is neither "body" nor a JSON Pointer`)
    } else {
      const optional = !!attr(tag, 'data-edit-optional')
      const { found } = resolvePointer(content.data, pointer)
      if (!found && !optional) problems.push(`${where}: no such field (and the label is not data-edit-optional)`)
    }
    // A choice label must offer what edit.json offers.
    const folder = file.split('/').slice(0, -1).join('/')
    const field = fieldsByFolder[folder]?.[pointer === 'body' ? 'body' : pointer.split('/')[1]]
    const type = attr(tag, 'data-edit-type')?.[1]
    if (field && type === 'choice') {
      const opts = decode(attr(tag, 'data-edit-options')?.[1] ?? '').split('|')
      if (JSON.stringify(opts) !== JSON.stringify(field.options)) problems.push(`${where}: options ${opts.join('|')} differ from edit.json's ${field.options.join('|')}`)
    }
    if (field && type && field.type !== type && !(field.type === 'number' && !type)) {
      problems.push(`${where}: type ${type} but edit.json says ${field.type}`)
    }
  }
}

if (problems.length) {
  console.error(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`)
  process.exit(1)
}
console.log(`edit.json valid; ${labels} labels on ${pages.length} pages, all pointing at existing files and fields.`)
