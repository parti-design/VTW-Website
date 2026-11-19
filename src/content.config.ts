// The content stays in the folders Jekyll used, untouched: the visual editor's edit.json
// points at them and the client writes there. Astro reads them in place. Schemas
// describe today's front matter; anything a template has a fallback for is optional,
// so an empty field in the editor never fails a build.
import { defineCollection, z } from 'astro:content'
import { file, glob } from 'astro/loaders'
import yaml from 'js-yaml'
import { parseJekyllDate } from './lib/dates'

/** "2025-08-29 08:40:00 -0400", as Jekyll writes dates. */
const jekyllDate = z.union([z.date(), z.string()]).transform((v, ctx) => {
  try {
    return parseJekyllDate(v)
  } catch (e) {
    ctx.addIssue({ code: 'custom', message: (e as Error).message })
    return z.NEVER
  }
})

/** A text field the editor may have emptied. */
const text = z.string().nullish()

/** Copy printed on the page: an empty or missing one prints nothing. */
const copy = z
  .string()
  .nullish()
  .transform((v) => v ?? '')

/** A gallery item: a path, or { image: path }. */
const galleryItem = z.union([z.string(), z.object({ image: z.string() })])

const projects = defineCollection({
  loader: glob({ base: '_projects', pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    // "New Construction" | "Renovation" | "Historical Restoration" in practice (the
    // editor offers those three); printed as given, "Project" when missing.
    type: text,
    year: z.union([z.number(), z.string()]).nullish(),
    location: text,
    // Rows of the project info box; empty ones don't show on the site.
    role: text,
    scope: text,
    // The meta description. The page itself shows the Markdown body.
    description: text,
    featured: z.boolean().default(false),
    cover_image: text,
    photo: text,
    gallery: z.array(galleryItem).nullish(),
    // Taken offline in the editor: published: false. No page, card or sitemap entry.
    published: z.boolean().default(true),
  }),
})

const posts = defineCollection({
  loader: glob({ base: '_posts', pattern: '*.md' }),
  schema: z.object({
    layout: z.literal('post').optional(),
    title: z.string(),
    date: jekyllDate,
    author: text,
    description: text,
    // Parked articles carry published: false. They get no page and no links.
    published: z.boolean().default(true),
  }),
})

// A photograph with its description, the shape the editor's image field keeps.
const image = z.object({ src: z.string(), alt: copy })

// Each page names its template in `layout` (src/pages/[...page].astro), and each
// template has its own texts. Every text on a page is a key in its file.
const pageBase = {
  title: z.string(),
  permalink: z.string().regex(/^\/(.+\/)?$/, 'a permalink starts and ends with /'),
  body_class: text,
  description: text,
}
const pageLayouts = z.discriminatedUnion('layout', [
  // Title, subtitle and a Markdown body. Jekyll's default for pages.
  z.object({ ...pageBase, layout: z.literal('page'), subtitle: text }),
  // The body as it is, HTML and all (no current page).
  z.object({ ...pageBase, layout: z.literal('default') }),
  z.object({
    ...pageBase,
    layout: z.literal('articles'),
    kicker: copy,
    subtitle: copy,
    latest_label: copy,
    read_article: copy,
    read_more: copy,
    empty: copy,
  }),
  z.object({
    ...pageBase,
    layout: z.literal('projects'),
    kicker: copy,
    subtitle: copy,
    // After the number of projects: "selected projects · Hudson Valley, NY".
    count_text: copy,
    // The filter buttons. `type` must be a project type, or "all".
    filters: z.array(z.object({ label: copy, type: z.string() })).default([]),
    count_one: copy,
    count_many: copy,
    featured_label: copy,
  }),
  z.object({
    ...pageBase,
    layout: z.literal('contact'),
    kicker: copy,
    lead: copy,
    include_label: copy,
    include: z.array(copy).default([]),
    // Phone and email are printed reversed and in pieces, and put together by a script,
    // so a scraper reading the HTML finds neither (src/layouts/Contact.astro).
    phone_label: copy,
    phone: text,
    phone_noscript: copy,
    email_label: copy,
    email: text,
    email_noscript: copy,
    // Shown in place of the phone and email until the script has run.
    script_needed: copy,
    based_label: copy,
    based: copy,
  }),
  z.object({
    ...pageBase,
    layout: z.literal('about'),
    hero: z.object({
      label: copy,
      place: copy,
      lead: copy,
      name: copy,
      role: copy,
      image,
      caption: copy,
    }),
    portrait: copy,
    facts: z.array(z.object({ label: copy, value: copy })).default([]),
    work: z.object({ heading: copy, paragraphs: z.array(copy).default([]) }),
    region: z.object({
      heading: copy,
      lead: copy,
      notes: z.array(z.object({ label: copy, text: copy })).default([]),
    }),
    heritage: z.object({ label: copy, lead: copy, body: copy }),
  }),
  z.object({
    ...pageBase,
    layout: z.literal('services'),
    kicker: copy,
    lead: copy,
    toc_label: copy,
    areas: z
      .array(
        z.object({
          toc_title: copy,
          toc_note: copy,
          title: copy,
          lead: copy,
          image,
          points: z.array(copy).default([]),
        }),
      )
      .default([]),
    billing: z.object({ label: copy, statement: copy, note: copy }),
    process: z.object({
      label: copy,
      heading: copy,
      steps: z.array(z.object({ title: copy, text: copy })).default([]),
    }),
  }),
  z.object({
    ...pageBase,
    layout: z.literal('faq'),
    kicker: copy,
    lead: copy,
    questions: z.array(z.object({ question: copy, answer: copy })).default([]),
  }),
])

const pages = defineCollection({
  loader: glob({ base: '_pages', pattern: '*.md' }),
  // A page that names no layout gets the plain one, as in Jekyll.
  schema: z.preprocess((v) => ({ layout: 'page', ...(v as object) }), pageLayouts),
})

// index.md: the home page has no body; every text on it is a key here.
const home = defineCollection({
  loader: glob({ base: '.', pattern: 'index.md' }),
  schema: z.object({
    layout: z.literal('home').optional(),
    title: z.string(),
    description: text,
    hero_image: text,
    statement_image: text,
    advocate_image: text,
    hero_label: copy,
    hero_heading: copy,
    hero_subheading: copy,
    hero_cta_text: copy,
    scroll_hint: copy,
    statement_text: copy,
    statement_aside: copy,
    advocate_label: copy,
    advocate_quote: copy,
    advocate_name: copy,
    advocate_context: copy,
    services_label: copy,
    services: z.array(z.object({ title: copy, text: copy })).default([]),
    services_link: copy,
    projects_label: copy,
    projects_link: copy,
    home_cta_heading: copy,
    home_cta_sub: copy,
    home_cta_link_text: copy,
  }),
})

// _data/testimonials.yml holds { testimonials: [...] }. The id is the item's position,
// so an editor label can point at /testimonials/<id>/quote.
const testimonials = defineCollection({
  loader: file('_data/testimonials.yml', {
    parser: (text) =>
      ((yaml.load(text) as { testimonials?: object[] })?.testimonials ?? []).map((t, i) => ({ ...t, id: String(i) })),
  }),
  schema: z.object({
    quote: z.string(),
    name: z.string(),
    project: text,
    featured: z.boolean().default(false),
  }),
})

// _data/site.yml: the texts every page shares (name, menu, footer, page frames). One
// entry, id "site".
const link = z.object({ title: z.string(), url: z.string() })
const site = defineCollection({
  loader: file('_data/site.yml', {
    parser: (text) => [{ ...(yaml.load(text) as object), id: 'site' }],
  }),
  schema: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    author: z.string(),
    nav: z.array(link),
    footer: z.object({
      entity: z.string(),
      office_heading: z.string(),
      office: z.string(),
      area_heading: z.string(),
      area: z.string(),
      links_heading: z.string(),
      links: z.array(link),
      copyright: z.string(),
    }),
    cta: z.object({ text: z.string(), link: z.string() }),
    page_label: z.string(),
    post: z.object({ label: z.string(), back: z.string() }),
    project: z.object({
      default_type: z.string(),
      info: z.string(),
      info_type: z.string(),
      info_year: z.string(),
      info_location: z.string(),
      info_role: z.string(),
      info_scope: z.string(),
      gallery: z.string(),
      back: z.string(),
    }),
    not_found: z.object({ title: z.string(), heading: z.string(), text: z.string(), link: z.string() }),
  }),
})

export const collections = { projects, posts, pages, home, testimonials, site }
