// Prints the nginx map entries that send each photo's old address to its new one, from
// docs/media-manifest.json. The Docker build runs it; nginx.conf includes the result.
//
//   node scripts/photo-redirects.mjs > photo-redirects.inc
//
// Until 2026-11-18 the photos were served from the site itself:
//   /assets/images/projects-final/<project>/<file>.jpg               the original
//   /assets/images/derived/projects-final/<project>/<file>-<w>.webp  its resized copies
// Each original goes to its master in the media library, each copy to the copy of the same
// width. Only copies that existed get an entry (the manifest's "reused" widths).
//
// Made at build time, not committed: the editor's media library counts any repo file that
// names a photo as a use of it, and this list names every one.
import { readFileSync } from 'node:fs'

const m = JSON.parse(readFileSync(new URL('../docs/media-manifest.json', import.meta.url), 'utf8'))
const lines = ['# Made by scripts/photo-redirects.mjs from docs/media-manifest.json. Do not edit.']
const safe = /^[\w/.:-]+$/ // nothing nginx would need escaped
const entry = (from, to) => {
  if (!safe.test(from) || !safe.test(to)) throw new Error(`unexpected characters in ${from} or ${to}`)
  lines.push(`${from} ${to};`)
}
let n = 0
for (const f of m.files) {
  const master = `${m.publicUrl}/${m.prefix}${f.folder}/${f.name}-${f.hash}`
  const old = '/' + f.from
  entry(old, `${master}.webp`)
  const stem = old.replace('/assets/images/', '/assets/images/derived/').replace(/\.jpe?g$/i, '')
  for (const w of f.reused) entry(`${stem}-${w}.webp`, `${master}-${w}.webp`)
  n += 1 + f.reused.length
}
if (n !== m.files.length + m.files.reduce((s, f) => s + f.reused.length, 0)) throw new Error('count mismatch')
process.stdout.write(lines.join('\n') + '\n')
