import { defineEventHandler, setHeader } from 'h3'
import { listBlogs } from '../utils/storage'
export default defineEventHandler(async event => {
  const cfg = useRuntimeConfig()
  const origin = String(cfg.public.siteUrl).replace(/\/$/, '')
  const blogs = await listBlogs()
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${blogs.map(b => `<url><loc>${escape(`${origin}/blog/${b.slug}`)}</loc><lastmod>${b.createdAt.slice(0, 10)}</lastmod></url>`).join('')}</urlset>`
})
