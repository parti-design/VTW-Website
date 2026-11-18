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
    // The meta description. The page itself shows the Markdown body.
    description: text,
    featured: z.boolean().default(false),
    cover_image: text,
    photo: text,
    gallery: z.array(galleryItem).nullish(),
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

const pages = defineCollection({
  loader: glob({ base: '_pages', pattern: '*.md' }),
  schema: z.object({
    // Which template renders the page; see src/pages/[...page].astro.
    layout: z.enum(['default', 'page', 'articles', 'projects', 'contact']).default('page'),
    title: z.string(),
    permalink: z.string().regex(/^\/(.+\/)?$/, 'a permalink starts and ends with /'),
    body_class: text,
    description: text,
    subtitle: text,
    // Contact details, kept apart so no scraper reads them whole (the contact layout).
    phone: text,
    phone_area: text,
    phone_prefix: text,
    phone_line: text,
    email: text,
    email_user: text,
    email_domain: text,
  }),
})

// index.md: the home page has no body, only these settings. Every text has a default
// in src/pages/index.astro.
const home = defineCollection({
  loader: glob({ base: '.', pattern: 'index.md' }),
  schema: z.object({
    layout: z.literal('home').optional(),
    title: z.string(),
    description: text,
    hero_image: text,
    statement_image: text,
    advocate_image: text,
    hero_label: text,
    hero_heading: text,
    hero_subheading: text,
    hero_cta_text: text,
    statement_text: text,
    statement_aside: text,
    advocate_label: text,
    advocate_quote: text,
    advocate_name: text,
    advocate_context: text,
    home_cta_heading: text,
    home_cta_sub: text,
    home_cta_link_text: text,
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

export const collections = { projects, posts, pages, home, testimonials }
