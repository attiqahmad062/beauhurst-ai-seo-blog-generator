import { createError, defineEventHandler, getRouterParam } from 'h3'
import { loadBlog } from '../../utils/storage'
export default defineEventHandler(async event => {
  const slug = getRouterParam(event, 'slug') || ''
  const blog = await loadBlog(slug)
  if (!blog) throw createError({ statusCode: 404, message: 'Article not found.' })
  return blog
})
