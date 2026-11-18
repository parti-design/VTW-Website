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
| `assets/` | CSS, the mark, photographs. Served at `/assets/` as-is (`src/integrations/passthrough.ts` says why not `public/`). |
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
| `_projects/*.md`, `_posts/*.md` | Title, type, town, year, summary and text, labelled on their own pages and wherever they are listed |
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

On a project page, town, year and the description always render, even when empty, so they
can be clicked; on the live site CSS hides an empty town or year and the dot beside it
(`main.css`, "Project meta").

Photos: the about and services photos are labelled as images (replace, or edit the
description). Uploads land in `assets/images/uploads/`, and `edit.json`'s
`modules.image.variants` has the editor store copies at 400, 800, 1200 and 1600 pixels next to
each as `<name>-<width>.<ext>`, the naming `src/lib/images.ts` reads. Photos already in
`assets/images/` keep their copies in `assets/images/derived/`, made by
`python3 tools/build-images.py` (ImageMagick) and committed; a photo whose copies are missing
shows its original and the build warns. Project covers and galleries, and the home page's
three background photos, are not labelled yet.

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
