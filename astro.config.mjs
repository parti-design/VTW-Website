// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config'
import passthrough from './src/integrations/passthrough'

export default defineConfig({
  site: 'https://vontrappwinter.com',

  // Static: nginx serves dist/ (Dockerfile). No server, no secrets.
  output: 'static',

  // Every URL is a folder with an index.html, ending in /, as on the Jekyll site.
  build: { format: 'directory' },

  // HTML as written: whitespace between inline elements is part of the design (the
  // filter buttons, the project meta line), and the CSS was written against Jekyll's
  // output.
  compressHTML: false,

  // Every photograph is pre-sized (src/lib/images.ts); nothing for Astro to optimise.
  image: { service: passthroughImageService() },

  // The CSS, the mark and the icons stay in assets/ and are served from /assets/
  // (src/integrations/passthrough.ts says why not public/). Photographs are in the
  // media library at https://media.parti.design/.
  integrations: [passthrough(['assets'])],

  // Screenshots compared against the old site kept catching the toolbar.
  devToolbar: { enabled: false },

  server: { port: 4400 },
})
