import { defineEventHandler } from 'h3'
import { listBlogs } from '../../utils/storage'
export default defineEventHandler(async () => listBlogs())
