import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { DatasetError, inspectCsv } from '../utils/dataset'

export default defineEventHandler(async event => {
  const declaredLength = Number(event.node.req.headers['content-length'] || 0)
  if (declaredLength > 2 * 1024 * 1024 + 16 * 1024) throw createError({ statusCode: 413, message: 'Upload exceeds the permitted request size.' })
  const parts = await readMultipartFormData(event)
  const file = parts?.find(p => p.name === 'file' && p.filename)
  if (!file || !/\.csv$/i.test(file.filename || '')) throw createError({ statusCode: 400, message: 'Upload a .csv file.' })
  if (file.data.length > 2 * 1024 * 1024) throw createError({ statusCode: 413, message: 'CSV exceeds the 2 MB file limit.' })
  try {
    const result = inspectCsv(file.data.toString('utf8'))
    return { headers: result.headers, suggested: result.suggested, count: result.rows.length, preview: result.rows.slice(0, 5) }
  } catch (err) {
    if (err instanceof DatasetError) throw createError({ statusCode: 422, message: err.message })
    throw err
  }
})
