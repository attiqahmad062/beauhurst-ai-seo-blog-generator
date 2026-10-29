import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().min(1).max(240),
  fundraising: z.number().finite().nonnegative(),
  website: z.string().max(500).optional(),
  location: z.string().max(240).optional(),
  description: z.string().max(1200).optional(),
  stage: z.string().max(160).optional(),
  employees: z.string().max(80).optional(),
  industries: z.string().max(2000).optional(),
  originalRank: z.number().int().positive().optional()
})
export type Company = z.infer<typeof companySchema>
export const rankedCompanySchema = companySchema.extend({ rank: z.number().int().positive() })
export type RankedCompany = z.infer<typeof rankedCompanySchema>
export const statsSchema = z.object({
  count: z.number().int().positive(), total: z.number().finite(), average: z.number().finite(),
  median: z.number().finite(), highest: z.number().finite(), lowest: z.number().finite(),
  topTenShare: z.number().min(0).max(100), topCompany: z.string(), currency: z.string().min(1)
})
export type Statistics = z.infer<typeof statsSchema>
export const contentSchema = z.object({
  title: z.string().min(15).max(125),
  metaDescription: z.string().min(40).max(200),
  introduction: z.string().min(40).max(1400),
  sections: z.array(z.object({ heading: z.string().min(5).max(150), paragraphs: z.array(z.string().min(30).max(1200)).min(1).max(3) })).min(2).max(5),
  conclusion: z.string().min(30).max(1200)
})
export type BlogContent = z.infer<typeof contentSchema>
export const blogSchema = z.object({
  id: z.string().uuid(), slug: z.string().regex(/^[a-z0-9-]+$/), industry: z.string().min(2).max(100),
  createdAt: z.string().datetime(), currency: z.string(),
  content: contentSchema, stats: statsSchema, companies: z.array(rankedCompanySchema).min(1).max(2000)
})
export type Blog = z.infer<typeof blogSchema>
