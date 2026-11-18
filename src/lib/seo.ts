// What jekyll-seo-tag 2.8 printed, worked out the same way, so titles, descriptions,
// canonicals, Open Graph, Twitter and JSON-LD stay as search engines know them.
import { site } from '../site.config'
import type { SiteTexts } from './content'
import { xmlschema } from './dates'
import { plainText } from './jekyll'

export interface SeoInput {
  /** URL path of the page, e.g. /projects/f-s-barn/ */
  path: string
  title?: string | null
  description?: string | null
  /** Markdown whose first paragraph stands in for a missing description (posts, projects). */
  body?: string | null
  /** Posts and projects have one; it makes the page an article. */
  date?: Date
  author?: string | null
  /** The content file the title and description come from, for the editor's labels. */
  file?: string
}

export interface Seo {
  title: string
  pageTitle: string
  description: string
  canonical: string
  ogType: 'article' | 'website'
  publishedTime?: string
  author: string
  jsonLd: string
}

/** Jekyll's excerpt: the body up to the first blank line. */
const firstParagraph = (body?: string | null) => body?.trim().split(/\n\s*\n/)[0] || undefined

const HOMEPAGE_OR_ABOUT = /^\/(about\/)?(index\.html?)?$/

export function seo(input: SeoInput, texts: SiteTexts): Seo {
  const siteTitle = plainText(texts.name)!
  const siteDescription = plainText(texts.description)!
  const pageTitle = plainText(input.title) ?? siteTitle
  const title =
    pageTitle !== siteTitle
      ? `${pageTitle} | ${siteTitle}`
      : `${siteTitle} | ${plainText(texts.tagline) ?? siteDescription}`
  const description = plainText(input.description ?? firstParagraph(input.body)) ?? siteDescription
  const canonical = site.url + input.path.replace(/\/index\.html$/, '/')
  const author = input.author || texts.author
  const homepageOrAbout = HOMEPAGE_OR_ABOUT.test(input.path)
  const type = homepageOrAbout ? 'WebSite' : input.date ? 'BlogPosting' : 'WebPage'
  const date = input.date && xmlschema(input.date)

  // jekyll-seo-tag sorts the keys and leaves out empty ones.
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': type,
    author: { '@type': 'Person', name: author },
    dateModified: date,
    datePublished: date,
    description,
    headline: pageTitle,
    mainEntityOfPage: type === 'BlogPosting' ? { '@type': 'WebPage', '@id': canonical } : undefined,
    name: homepageOrAbout ? siteTitle : undefined,
    url: canonical,
  }

  return {
    title,
    pageTitle,
    description,
    canonical,
    ogType: input.date ? 'article' : 'website',
    publishedTime: date,
    author,
    jsonLd: JSON.stringify(ld).replace(/</g, '\\u003c'),
  }
}
