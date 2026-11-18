// What the templates ask of the content: which entries exist, in which order, and at
// which URL. URLs are the old site's, character for character.
import { getCollection, getEntry, type CollectionEntry } from 'astro:content'
import { buildTime, datePath } from './dates'

export type Project = CollectionEntry<'projects'>
export type Post = CollectionEntry<'posts'>
export type Page = CollectionEntry<'pages'>
/** A page known to use one layout, with that layout's fields. */
export type PageWith<L extends Page['data']['layout']> = Page & { data: Extract<Page['data'], { layout: L }> }

/** /projects/<file name>/ */
export const projectUrl = (p: Project) => `/projects/${p.id}/`

/** The post's slug: its file name without the date. */
export const postSlug = (p: Post) => p.id.replace(/^\d{4}-\d{2}-\d{2}-/, '')

/** /:year/:month/:day/:title/ */
export const postUrl = (p: Post) => `/${datePath(p.data.date)}/${postSlug(p)}/`

/** Projects in file-name order, as Jekyll listed site.projects. */
export async function getProjects(): Promise<Project[]> {
  return (await getCollection('projects')).sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Live articles, newest first (Jekyll's site.posts). Parked ones (published: false) and
 * ones dated in the future are left out, as Jekyll left them out.
 */
export async function getPosts(): Promise<Post[]> {
  return (await getCollection('posts', (p) => p.data.published && p.data.date <= buildTime)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime() || b.id.localeCompare(a.id),
  )
}

/** _pages/*.md in file-name order (the order jekyll-sitemap listed them in). */
export async function getPages(): Promise<Page[]> {
  return (await getCollection('pages')).sort((a, b) => a.id.localeCompare(b.id))
}

/** The file the shared texts live in, for editor labels. */
export const SITE_FILE = '_data/site.yml'
export type SiteTexts = CollectionEntry<'site'>['data']

/** The texts every page shares (_data/site.yml). */
export async function getSite(): Promise<SiteTexts> {
  const entry = await getEntry('site', 'site')
  if (!entry) throw new Error(`${SITE_FILE} is missing`)
  return entry.data
}

export async function getHome() {
  const [home] = await getCollection('home')
  if (!home) throw new Error('index.md is missing')
  return home
}

/** The image a project shows first: its cover, else its first gallery photo. */
export function projectCover(p: Project, fallbackToGallery = false): string | undefined {
  const cover = p.data.cover_image || p.data.photo
  if (cover || !fallbackToGallery) return cover || undefined
  const first = p.data.gallery?.[0]
  return typeof first === 'string' ? first : first?.image
}

/** The types a project can have: edit.json offers these three in the editor. */
export const PROJECT_TYPES = ['New Construction', 'Renovation', 'Historical Restoration']

/** Editor labels for a project's fields, wherever the project appears. */
export const projectLabels = {
  type: { type: 'choice', label: 'Type of project', options: PROJECT_TYPES, optional: true },
  title: { label: 'Project title' },
  location: { label: 'Location', placeholder: 'Add the town or area', optional: true },
  year: { label: 'Year finished', placeholder: 'Add the year', optional: true },
  role: { label: 'Your role', placeholder: 'Add your role, e.g. design and build', optional: true },
  scope: { label: 'Scope of work', placeholder: 'Add what was done, e.g. new porch, kitchen, restored frame', optional: true },
} as const

/** Gallery photo paths. */
export const galleryImages = (p: Project) =>
  (p.data.gallery ?? []).map((g) => (typeof g === 'string' ? g : g.image))
