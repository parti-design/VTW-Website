// /sitemap.xml, as jekyll-sitemap wrote it: live articles (oldest first, dated), then
// projects (dated with the build, as Jekyll dated them), then the pages, home included,
// in file-name order. Not @astrojs/sitemap: that writes sitemap-index.xml and
// sitemap-0.xml, and robots.txt and Search Console both point at /sitemap.xml.
import type { APIRoute } from 'astro'
import { getHome, getPages, getPosts, getProjects, postUrl, projectUrl } from '../lib/content'
import { buildTime, xmlschema } from '../lib/dates'
import { site } from '../site.config'

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const GET: APIRoute = async () => {
  const urls: { path: string; lastmod?: Date }[] = []

  for (const post of (await getPosts()).reverse()) urls.push({ path: postUrl(post), lastmod: post.data.date })
  for (const project of await getProjects()) urls.push({ path: projectUrl(project), lastmod: buildTime })

  const home = await getHome()
  const pages = [
    ...(await getPages()).map((p) => ({ name: p.filePath!.split('/').pop()!, path: p.data.permalink })),
    { name: home.filePath!.split('/').pop()!, path: '/' },
  ].sort((a, b) => a.name.localeCompare(b.name))
  for (const page of pages) urls.push({ path: page.path })

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `<url>\n<loc>${xml(site.url + u.path)}</loc>\n` +
          (u.lastmod ? `<lastmod>${xmlschema(u.lastmod)}</lastmod>\n` : '') +
          `</url>\n`,
      )
      .join('') +
    `</urlset>\n`

  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
