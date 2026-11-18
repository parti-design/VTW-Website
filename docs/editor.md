# How the site is built, and wired for the visual editor

The site is Astro 5, built to static files and served by nginx on Coolify, with Cloudflare
in front. It can be edited by clicking on the page, in the editor at https://grove.parti.design
(source: `~/Documents/GitHub/grove-editor`, contract in its `docs/making-a-site-editable.md`).
The editor reads and writes the repo's files and commits to `main`; Coolify rebuilds.

Before November 2026 the site was Jekyll on GitHub Pages. The content files did not change in
the move to Astro; URLs, titles, descriptions, text, the feed and the sitemap were checked
against the old site, and the main pages compared pixel for pixel at desktop and phone width.

## Layout

| Where | What |
|---|---|
| `_projects/`, `_posts/`, `_pages/`, `index.md`, `_data/` | Content, where Jekyll had it. Loaded in place by `src/content.config.ts` (glob and file loaders, zod schemas). |
| `assets/` | CSS, the mark, photographs. Served at `/assets/` as-is (`src/integrations/passthrough.ts` says why not `public/`). |
| `public/` | `favicon.ico`, `robots.txt`, `edit-bridge.js`. |
| `src/site.config.ts` | What `_config.yml` held: title, URL, nav, Umami, the editor's address. |
| `src/pages/` | One file per kind of page. `[...page].astro` renders each `_pages` file at its `permalink`, in the layout it names. |
| `src/layouts/`, `src/components/` | The old `_layouts` and `_includes`, same markup and classes. |
| `src/lib/` | `content.ts` (order, URLs), `jekyll.ts` (Liquid and kramdown compatibility), `seo.ts` (jekyll-seo-tag), `images.ts`, `edit.ts`, `dates.ts`. |
| `Dockerfile`, `nginx.conf`, `security-headers.inc` | The deploy. |

The content still carries Jekyll habits: `{% include img.html %}` in the about and services
pages, `{% post_url %}` links between articles. `src/lib/jekyll.ts` runs exactly those and
renders Markdown the way kramdown did; anything else fails the build with the file named. A
`post_url` to a parked article (`published: false`) fails the build, as it did on Jekyll.

## What the site gives the editor

- **Labels.** An element that shows a stored value carries
  `data-edit="<file>#<pointer>"`, e.g. `data-edit="_projects/f-s-barn.md#/title"`. The pointer
  is a JSON Pointer into the front matter, or `body` for the Markdown body. Optional
  `data-edit-*` attributes give a type, a name for people, a placeholder, choices, and say
  when a key may be missing.
- **One helper writes every label**: `edit()` in `src/lib/edit.ts`. Never type `data-edit`
  by hand. Spread it onto the element:

  ```astro
  <h1 class="ip__title" {...edit(project.filePath, '/title', { label: 'Project title' })}>
  ```

  | Option | Attribute | Meaning |
  |---|---|---|
  | `type` | `data-edit-type` | `rich` for Markdown, `choice` for a fixed list; text is the default |
  | `label` | `data-edit-label` | name shown in the editor's Changes and History |
  | `placeholder` | `data-edit-placeholder` | shown in the editor while the value is empty |
  | `options` | `data-edit-options` | choices for `type: 'choice'` |
  | `optional` | `data-edit-optional` | the key may be missing (the template has a fallback) |
  | `max`, `multiline` | `data-edit-max`, `data-edit-multiline` | limits for text |

- **The bridge.** `public/edit-bridge.js` (a copy of `grove-editor/bridge/edit-bridge.js`)
  loads at the end of every page (`src/components/EditBridge.astro`). It does nothing for
  visitors; adding `?edit` to any page URL opens that page in the editor. It talks only to
  `editorUrl` in `src/site.config.ts`.
- **Framing.** nginx sends `Content-Security-Policy: frame-ancestors 'self'
  https://grove.parti.design` and no `X-Frame-Options`, so the editor can frame the site and
  nobody else can. If the editor moves, change `security-headers.inc` and `site.config.ts`.
- **The build marker.** Every page prints `<meta name="edit:commit" content="<sha>">`, so the
  editor can tell when a publish is live. The sha is `SOURCE_COMMIT` from Coolify, or git's
  `HEAD` in a local build (`src/lib/build-info.ts`).
- **The manifest.** `edit.json` at the repo root (not published) lists the files the editor
  may write, the media folder, and the projects collection: its fields, defaults for a new
  project, and its URL pattern `/projects/{slug}/`, where the slug is the file name.
- **The check.** `pnpm build && pnpm check:labels` confirms every label points at an existing,
  editable file and field, and every project has its page.

## What is labelled

The project page (`src/pages/projects/[slug].astro`): title, type (a choice of three), town,
year and the description (the Markdown body). Town, year and the description always render,
even when empty, so they can be clicked; on the live site CSS hides an empty town or year and
the dot beside it (`main.css`, "Project meta").

The photos are not labelled yet. The image component is ready for it: uploads land in
`assets/images/uploads/` and, with `modules.image.variants` set in `edit.json`, the editor
stores resized copies next to each upload as `<name>-<width>.<ext>`, which is the naming
`src/lib/images.ts` reads. Photos already in `assets/images/` keep their copies in
`assets/images/derived/`, made by `python3 tools/build-images.py` (ImageMagick) and committed;
a photo whose copies are missing shows its original and the build warns.

The projects page keeps its curated order and card sizes (`src/layouts/Projects.astro`), and
lists any project missing from that order after it as a third-width card, so a project added
in the editor shows up.

## Running it locally

Node 24 (`~/.nvm/versions/node/v24.22.3/bin`) and pnpm 10.

```bash
pnpm install
pnpm dev                     # http://localhost:4400
pnpm build                   # dist/
pnpm check                   # astro check
pnpm check:labels            # after a build
```

Against a local editor: start it from `~/Documents/GitHub/grove-editor` (see its README; it
listens on http://localhost:8787), then run the site with
`PUBLIC_EDITOR_URL=http://localhost:8787 pnpm dev`. In the editor's admin, add a site with
repository `local:<absolute path to this repo>`, the branch you are working on, and address
`http://localhost:4400`. Its **This page** panel lists any broken labels.

## Deploying (Coolify)

- Build pack: Dockerfile, port 80. The image is nginx and `dist/`, nothing else; it has a
  health check on `/`.
- Switch on **Include Source Commit in Build**, so `SOURCE_COMMIT` reaches the build and the
  editor sees each publish go live. No other build arguments or environment variables.
- Cloudflare in front, as before: it terminates TLS, and nginx takes the visitor's IP from
  `CF-Connecting-IP`.
