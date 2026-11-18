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
| `_projects/`, `_posts/`, `_pages/`, `index.md`, `_data/` | Content, where Jekyll had it, and every text on the site (below). Loaded in place by `src/content.config.ts` (glob and file loaders, zod schemas). |
| `assets/` | CSS, the mark, the icons. Served at `/assets/` as-is (`src/integrations/passthrough.ts` says why not `public/`). Photographs are not in the repo (below). |
| `public/` | `favicon.ico`, `robots.txt`, `edit-bridge.js`. |
| `src/site.config.ts` | What `_config.yml` held that is not text: URL, Umami, the editor's address. |
| `src/pages/` | One file per kind of page. `[...page].astro` renders each `_pages` file at its `permalink`, in the layout it names. |
| `src/layouts/`, `src/components/` | The old `_layouts` and `_includes`, and the markup that used to be the about, services and FAQ bodies; same elements and classes. No copy. |
| `src/lib/` | `content.ts` (order, URLs), `jekyll.ts` (Liquid and kramdown compatibility), `seo.ts` (jekyll-seo-tag), `images.ts`, `edit.ts`, `dates.ts`. |
| `Dockerfile`, `nginx.conf`, `security-headers.inc` | The deploy. |

The articles still carry a Jekyll habit: `{% post_url %}` links between them.
`src/lib/jekyll.ts` runs that (and `{% include img.html %}`, should a body use it) and renders
Markdown the way kramdown did; anything else fails the build with the file named. A `post_url`
to a parked article (`published: false`) fails the build, as it did on Jekyll.

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
  | `marks`, `headings` | `data-edit-marks`, `data-edit-headings` | what a rich text may use |

  Labels are written for Severin, in plain words ("Menu item 2", "Footer: postal address",
  "Area 3: point 4"), since they are what the editor shows him.

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

## Where the texts live, and what is labelled

Every text on the site is in a content file and labelled where it shows. Templates hold no
copy.

| File | Texts |
|---|---|
| `_data/site.yml` | Site name, tagline, default description, author; the menu; the footer (entity line, headings, address, area, links, copyright); the call to action at the foot of pages; the frames around articles and projects; the plain page's kicker; the page-not-found texts |
| `index.md` | Every home page text: top, statement, quote, the four services, section headings and links, the closing call to action |
| `_pages/about.md`, `services.md`, `faq.md` | All their copy, as structured fields (the markup that used to be their body is in `src/layouts/`) |
| `_pages/projects.md`, `articles.md`, `contact.md` | Kickers, introductions, filter buttons, link texts, field names, phone and email |
| `_projects/*.md`, `_posts/*.md` | Title, type, location, year, role, scope, summary and text, labelled on their own pages and wherever they are listed |
| `_data/testimonials.yml` | The home page testimonials |

Every page's `<title>` and meta description are labelled too, so the editor's page panel lists
them. Texts with italics, bold or links are Markdown and edit as rich text.

Left in the templates, on purpose: numbers that follow the order (01-04, step 1-4), the "404"
status code, article dates (part of each article's address; changing one moves the page), the
VTW monogram (the mark, set from its letters' ink widths), punctuation the layout adds (the
quotation marks around quotes, ·, ©, the arrow and close buttons), and accessibility labels
that never show on screen (aria-label). The contact page's "Available with JavaScript enabled"
and its no-script notes are in `contact.md` but carry no label: a browser running the editor
never shows them.

A project page has a project info box (type, year, location, role, scope) beside a
description box. Every row and the description always render, even when empty, so they can
be clicked; on the live site CSS hides an empty row, and a project without a description
shows its info across the page instead (`main.css`, "Project info"). The row names and the
info box's heading are site-wide texts in `_data/site.yml` under `project`.

The projects page keeps its curated order and card sizes (`src/layouts/Projects.astro`), and
lists any project missing from that order after it as a third-width card, so a project added
in the editor shows up.

## Photographs

Every photograph is in Grove's media library, the R2 bucket `grove-media` served at
https://media.parti.design/, and the content files hold its full address. The repo holds no
photos; `assets/images/` has only the mark, the wave, the cursors and the icons.

- **Masters and copies.** Each photo is a WebP master with copies 400, 800, 1200 and 1600
  pixels wide next to it, same format, the width added to the name:

  ```
  https://media.parti.design/grove/vtw/projects/f-s-barn/barn-3f9a1c2b7d4e.webp
  https://media.parti.design/grove/vtw/projects/f-s-barn/barn-3f9a1c2b7d4e-800.webp
  ```

  `src/lib/images.ts` writes `srcset` from that naming (it can't see the bucket, so it
  trusts the copies are there); the page shows a copy and the lightbox opens the master. The
  12 characters before the width are the start of the master's SHA-256, so a stored file
  never changes and is sent with `Cache-Control: public, max-age=31536000, immutable`.
- **Editing.** Every photo on the site is labelled: the about and services photos, the home
  page's three background photos (while editing, clicks in the empty space over them reach
  the photo, `home.css`), each project's cover (on its page and on the project cards) and each
  project's gallery (a `gallery` field: add from the library, remove, reorder). Clients only
  choose photos from the library; Parti uploads. An upload from a field goes into that field's
  folder (a project's photos into `grove/vtw/projects/<slug>/`), otherwise under
  `grove/vtw/<year>/<month>/`, with the copies `modules.image.variants` lists (the editor
  leaves out any wider than the photo). The **Media** panel lists every photo and where it is
  used, found by searching the repo's text files for the name and hash. Photos inside article
  text are part of the article body and can't be picked from the library yet.
- **The move.** Until November 2026 the photos were JPEGs in `assets/images/projects-final/`
  (about 290 MB), with WebP copies in `assets/images/derived/` made by
  `tools/build-images.py`. On 2026-11-18 all 183 went to `grove/vtw/projects/<project>/`:
  the master re-encoded from the JPEG at its own size (1743 to 2048 pixels wide, quality 90),
  the copies the site already served reused byte for byte (400 and 800 for every photo, 1200
  and 1600 for the 18 shown large), and the missing 1200 and 1600 copies made with the old
  script's settings. The about, services and home photos are project photos, so they are
  stored once, in their project's folder. `docs/media-manifest.json` lists every object; it
  keeps folder, name and hash apart so the media library doesn't count it as a use.
- **Old addresses.** Links elsewhere and image search still point at the photos' old
  addresses. nginx answers each of them (183 originals, 402 resized copies) with a 301 to
  the new one: an original to its master, a copy to the copy of the same width. The list is
  made from the manifest while the Docker image is built (`scripts/photo-redirects.mjs`,
  included by `nginx.conf`'s `map`), not committed, so the media library doesn't count it
  as a use of every photo. Any other missing path under `/assets/images/` is still a 404.
- **Rolling the move back.** Revert the commit that made it and the one that added the
  redirects (the photos and the script come back from git), deploy, then delete the objects the manifest lists, and the rows for
  `grove/vtw/projects/` in the editor's `media_s3_objects` table.
- **Open Graph.** No page sets `og:image` (jekyll-seo-tag had no image configured, and the
  Astro port kept that). To add one, store a JPEG as its own master in the library (its own
  name and hash), since copies must share their master's format, and point the tag at it.

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

- Build pack: Dockerfile, port 80. The image is nginx, `dist/` and the photo redirect list,
  nothing else; the build runs `nginx -t`, and the image has a health check on `/`.
- Switch on **Include Source Commit in Build**, so `SOURCE_COMMIT` reaches the build and the
  editor sees each publish go live. No other build arguments or environment variables.
- Cloudflare in front, as before: it terminates TLS, and nginx takes the visitor's IP from
  `CF-Connecting-IP`.
