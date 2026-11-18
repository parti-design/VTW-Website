// Serves repo folders at their own path, untouched: assets/ at /assets/.
//
// Why not public/: the visual editor commits uploads into the repo at the path they are
// served from (edit.json "media": "assets/images/uploads" becomes /assets/images/uploads/
// in front matter). Under public/ the two would differ, and every upload would point at
// a file that does not exist. Keeping assets/ where it is also leaves every image path
// in the content, tools/build-images.py and .pages.yml as they were.
//
// Dev: answered by a middleware. Build: copied into dist/ once the pages are written.
import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

const TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
}

const visible = (path: string) => !path.split(sep).some((part) => part.startsWith('.'))

export default function passthrough(dirs: string[]): AstroIntegration {
  let root = ''
  return {
    name: 'passthrough',
    hooks: {
      'astro:config:done': ({ config }) => {
        root = fileURLToPath(config.root)
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          const path = decodeURIComponent((req.url ?? '').split(/[?#]/)[0])
          const dir = dirs.find((d) => path.startsWith(`/${d}/`))
          if (!dir) return next()
          const file = normalize(join(root, path))
          if (!file.startsWith(join(root, dir) + sep) || !visible(file) || !existsSync(file) || !statSync(file).isFile()) {
            return next()
          }
          res.setHeader('Content-Type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream')
          createReadStream(file).pipe(res)
        })
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
