import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { z } from 'zod'
import { DatasetError, normalizedCompanies, rankAndSummarize } from '../utils/dataset'
import { generateContent } from '../utils/content'
import { saveBlog } from '../utils/storage'
import { blogSchema } from '../../shared/domain'

const optionsSchema = z.object({
  industry: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N} &/().-]+$/u),
  currency: z.enum(['GBP', 'USD', 'EUR']),
  mapping: z.object({ name: z.string(), fundraising: z.string(), website: z.string().optional(), location: z.string().optional(), description: z.string().optional(), stage: z.string().optional(), employees: z.string().optional(), industries: z.string().optional(), originalRank: z.string().optional() })
})
function slugify(input: string) {
  return input.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'industry'
}
export default defineEventHandler(async event => {
  const declaredLength = Number(event.node.req.headers['content-length'] || 0)
  if (declaredLength > 2 * 1024 * 1024 + 16 * 1024) throw createError({ statusCode: 413, message: 'Upload exceeds the permitted request size.' })
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  const opts = parts?.find(p => p.name === 'options')
  if (!file || !/\.csv$/i.test(file.filename || '')) throw createError({ statusCode: 400, message: 'Upload a CSV file.' })
  if (file.data.length > 2 * 1024 * 1024) throw createError({ statusCode: 413, message: 'Maximum file size is 2 MB.' })
  if (!opts) throw createError({ statusCode: 400, message: 'Generation options are required.' })
  let input: z.infer<typeof optionsSchema>
  try { input = optionsSchema.parse(JSON.parse(opts.data.toString('utf8'))) }
  catch { throw createError({ statusCode: 422, message: 'Industry, currency or column mapping is invalid.' }) }
  try {
    const rows = normalizedCompanies(file.data.toString('utf8'), input.mapping, input.currency)
    const { companies, stats } = rankAndSummarize(rows, input.currency)
    const content = await generateContent(input.industry, stats, companies)
    const slug = `${slugify(input.industry)}-companies-by-fundraising-${crypto.randomUUID().slice(0, 8)}`
    const blog = blogSchema.parse({ id: crypto.randomUUID(), slug, industry: input.industry, createdAt: new Date().toISOString(), currency: input.currency, content, stats, companies })
    await saveBlog(blog)
    return { slug, url: `/blog/${slug}` }
  } catch (err) {
    if (err instanceof DatasetError) throw createError({ statusCode: 422, message: err.message })
    throw err
  }
})
