# The visual editor

The site can be edited by clicking on the page, in the editor at https://grove.parti.design
(source: `~/Documents/GitHub/grove-editor`, contract in its `docs/making-a-site-editable.md`).
The editor reads and writes the repo's files and commits to `main`; GitHub Pages rebuilds as
usual. Nothing here changes what visitors see.

## What the site provides

- **Labels.** An element that shows a stored value carries
  `data-edit="<file>#<pointer>"`, e.g. `data-edit="_projects/f-s-barn.md#/title"`. The pointer
  is a JSON Pointer into the front matter, or `body` for the Markdown body. Optional
  `data-edit-*` attributes give the editor a type, a name for people, a placeholder, choices,
  and say when a key may be missing.
- **One helper writes every label**: `_includes/edit.html`. Never type `data-edit` by hand.
  It prints its own leading space, so call it right after the last attribute:

  ```liquid
  <h1 class="ip__title"{% include edit.html f=page.path p="/title" l="Project title" %}>
  ```

  | Param | Attribute | Meaning |
  |---|---|---|
  | `f` | `data-edit` (file) | repo-relative path: `page.path`, or the loop item's `path` in a loop |
  | `p` | `data-edit` (pointer) | `"/title"`, `"/location"`, or `"body"` |
  | `t` | `data-edit-type` | `rich` for Markdown, `choice` for a fixed list; text is the default |
  | `l` | `data-edit-label` | name shown in the editor's Changes and History |
  | `ph` | `data-edit-placeholder` | shown in the editor while the value is empty |
  | `opts` | `data-edit-options` | choices for `t="choice"`, separated by `\|` |
  | `opt` | `data-edit-optional` | the key may be missing (the template has a fallback) |

- **The bridge.** `edit-bridge.js` (a copy of `grove-editor/bridge/edit-bridge.js`) loads at
  the end of `_layouts/default.html` and `_layouts/home.html`. It does nothing for visitors;
  adding `?edit` to any page URL opens that page in the editor. It talks only to
  `editor_url` from `_config.yml`.
- **The build marker.** Both layouts print
  `<meta name="edit:commit" content="{{ site.github.build_revision }}">`, so the editor can
  tell when a publish is live. It is empty in local builds.
- **The manifest.** `edit.json` at the repo root (kept out of the built site) lists the files
  the editor may write, the media folder, and the projects collection: its fields, defaults
  for a new project, and its URL pattern `/projects/{slug}/`, where the slug is the file name.

## What is labelled

The project page (`_layouts/project.html`): title, type (a choice of three), town, year and
the description (the Markdown body). Town and year always render, even when empty, so they
can be clicked; on the live site CSS hides an empty one and the dot beside it (`main.css`,
"Project meta"). The cover image and gallery are not labelled yet: photo editing waits until
the build can make the resized copies that `tools/build-images.py` makes now.

The projects page keeps its curated order and card sizes, and lists any project missing from
that order after it as a third-width card, so a project added in the editor shows up.

Printed text is escaped (`| escape`), so a quote or `&` in a title cannot break the markup.

## Running it locally

1. Start the editor from `~/Documents/GitHub/grove-editor` (see its README; Node 24). It
   listens on http://localhost:8787.
2. Serve the site against it:

   ```bash
   export PATH="/opt/homebrew/opt/ruby/bin:$PATH"
   bundle exec jekyll serve --config _config.yml,_config.editor-local.yml --port 4010
   ```

   `_config.editor-local.yml` points `editor_url` at the local editor and `url` at
   http://localhost:4010.
3. In the editor's admin, add a site with repository `local:<absolute path to this repo>`,
   the branch you are working on, and address `http://localhost:4010`, then open it. The
   editor's **This page** panel lists any broken labels.
