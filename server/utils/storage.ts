import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { blogSchema, type Blog } from '../../shared/domain'

const directory = () => resolve(String(useRuntimeConfig().dataDir))
export async function saveBlog(blog: Blog) {
  const dir = directory()
  await mkdir(dir, { recursive: true })
  const filename = join(dir, `${blog.slug}.json`)
  const temp = join(dir, `.${blog.slug}.${crypto.randomUUID()}.tmp`)
  await writeFile(temp, JSON.stringify(blog), { encoding: 'utf8', flag: 'wx', mode: 0o600 })
  await rename(temp, filename)
}
export async function loadBlog(slug: string): Promise<Blog | null> {
  if (!/^[a-z0-9-]{1,160}$/.test(slug)) return null
  try { return blogSchema.parse(JSON.parse(await readFile(join(directory(), `${slug}.json`), 'utf8'))) }
  catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null; throw e }
}
export async function listBlogs() {
  await mkdir(directory(), { recursive: true })
  const names = (await readdir(directory())).filter(n => /^[a-z0-9-]+\.json$/.test(n))
  const blogs = await Promise.all(names.map(n => loadBlog(n.slice(0, -5))))
  return blogs.filter((b): b is Blog => Boolean(b)).map(({ slug, industry, content, stats, createdAt }) => ({ slug, industry, title: content.title, count: stats.count, createdAt })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
