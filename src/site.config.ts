// Everything about the site that is not content: what _config.yml held under Jekyll.
// Values a client edits belong in the content folders instead (_projects, _posts,
// _pages, _data, index.md).

export const site = {
  title: 'Von Trapp Winter',
  tagline: 'Building Specialist',
  description:
    'Building specialist in new construction, renovation, and the restoration of historical barns and houses in the Hudson Valley, NY.',
  // Canonical origin, no trailing slash. astro.config.mjs reads it too.
  url: 'https://vontrappwinter.com',
  author: { name: 'Severin Winter' },
  locale: 'en_US',

  nav: [
    { title: 'About', url: '/about/' },
    { title: 'Services', url: '/services/' },
    { title: 'Projects', url: '/projects/' },
    { title: 'FAQ', url: '/faq/' },
    { title: 'Contact', url: '/contact/' },
  ],

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

export type NavLink = (typeof site.nav)[number]
