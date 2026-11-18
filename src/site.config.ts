// What _config.yml held under Jekyll, less the texts: those are content and live in
// _data/site.yml, where the visual editor reaches them.

export const site = {
  // Canonical origin, no trailing slash. astro.config.mjs has it too.
  url: 'https://vontrappwinter.com',
  locale: 'en_US',

  // Umami, self-hosted and cookieless. data-domains pins reporting to the live host,
  // so local builds and previews send nothing.
  umami: {
    src: 'https://stats.parti.design/script.js',
    websiteId: 'a154c352-3f3f-4338-881b-999663770be9',
    domains: 'vontrappwinter.com',
  },

  // The visual editor that frames this site (docs/editor.md). edit-bridge.js only
  // talks to this origin. Point it at a local editor with
  //   PUBLIC_EDITOR_URL=http://localhost:8787 pnpm dev
  editorUrl: import.meta.env.PUBLIC_EDITOR_URL || 'https://grove.parti.design',
}
