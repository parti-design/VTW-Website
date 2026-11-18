// /feed.xml: the Atom feed jekyll-feed made, entry for entry: the ten newest live
// articles, full text, description as the summary.
import type { APIRoute } from 'astro'
import { getPosts, postUrl } from '../lib/content'
import { buildTime, xmlschema } from '../lib/dates'
import { normalizeWhitespace, plainText, renderBody, stripHtml } from '../lib/jekyll'
import { site } from '../site.config'

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const cdata = (s: string) => `<![CDATA[${s.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`

export const GET: APIRoute = async () => {
  const posts = (await getPosts()).slice(0, 10)
  const self = `${site.url}/feed.xml`

  const entries = posts.map((post) => {
    const url = site.url + postUrl(post)
    const title = xml(plainText(post.data.title) ?? '')
    const date = xmlschema(post.data.date)
    const summarySource = post.data.description || post.body?.trim().split(/\n\s*\n/)[0]
    const summary = summarySource ? normalizeWhitespace(stripHtml(summarySource)) : ''
    return (
      `<entry>` +
      `<title type="html">${title}</title>` +
      `<link href="${xml(url)}" rel="alternate" type="text/html" title="${title}" />` +
      `<published>${date}</published>` +
      `<updated>${date}</updated>` +
      `<id>${xml(url.replace(/\/$/, ''))}</id>` +
      `<content type="html" xml:base="${xml(url)}">${cdata(renderBody(post))}</content>` +
      `<author><name>${xml(post.data.author || site.author.name)}</name></author>` +
      (summary ? `<summary type="html">${cdata(summary)}</summary>` : '') +
      `</entry>`
    )
  })

  const body =
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<feed xmlns="http://www.w3.org/2005/Atom" >` +
    `<generator uri="https://astro.build/">Astro</generator>` +
    `<link href="${self}" rel="self" type="application/atom+xml" />` +
    `<link href="${site.url}/" rel="alternate" type="text/html" />` +
    `<updated>${xmlschema(buildTime)}</updated>` +
    `<id>${self}</id>` +
    `<title type="html">${xml(plainText(site.title)!)}</title>` +
    `<subtitle>${xml(site.description)}</subtitle>` +
    `<author><name>${xml(site.author.name)}</name></author>` +
    entries.join('') +
    `</feed>`

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
