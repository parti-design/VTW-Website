// Serves repo folders at their own path, untouched: assets/ at /assets/.
//
// Why not public/: the visual editor commits uploads into the repo at the path they are
// served from (edit.json "media": "assets/images/uploads" becomes /assets/images/uploads/
// in front matter). Under public/ the two would differ, and every upload would point at
// a file that does not exist. Keeping assets/ where it is also leaves the paths of the
// CSS, the mark and the icons as they were. (Photographs are in the media library at
// https://media.parti.design/, not in the repo; see src/lib/images.ts.)
//
// Build: copied into dist/ once the pages are written. Dev needs nothing: Vite already
// serves files under the project root at their own path.
import { cpSync } from 'node:fs'
import { join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

const visible = (path: string) => !path.split(sep).some((part) => part.startsWith('.'))

export default function passthrough(dirs: string[]): AstroIntegration {
  let root = ''
  return {
    name: 'passthrough',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root)
      },
      'astro:build:done': ({ dir, logger }) => {
        for (const d of dirs) {
          const from = join(root, d)
          cpSync(from, join(fileURLToPath(dir), d), { recursive: true, filter: (src) => visible(src.slice(from.length)) })
          logger.info(`copied ${d}/`)
        }
      },
    },
  }
}
