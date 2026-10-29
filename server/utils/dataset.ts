import Papa from 'papaparse'
import type { Company, RankedCompany, Statistics } from '../../shared/domain'

export class DatasetError extends Error { constructor(message: string) { super(message); this.name = 'DatasetError' } }
export type MappingField = 'name' | 'fundraising' | 'website' | 'location' | 'description' | 'stage' | 'employees' | 'industries' | 'originalRank'
export type Mapping = Partial<Record<MappingField, string>>
const aliases: Record<MappingField, string[]> = {
  name: ['company', 'companyname', 'businessname', 'organisation', 'organization', 'name'],
  fundraising: ['totalfundraising', 'fundraisingtotal', 'fundingtotal', 'fundingraised', 'totalraised', 'amountfundraised', 'fundraising', 'totalfunding', 'raised', 'funding'],
  website: ['website', 'webaddress', 'url', 'companywebsite'],
  location: ['location', 'headquarters', 'hq', 'city', 'region'],
  description: ['description', 'summary', 'about', 'companydescription'],
  stage: ['stage', 'fundingstage', 'investmentstage', 'growthstage'],
  employees: ['employees', 'employeecount', 'numberofemployees', 'staff', 'headcount', 'companysize'],
  industries: ['industries', 'industry', 'sectors', 'sector', 'categories'],
  originalRank: ['rank', 'ranking', 'position']
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
export function suggestMapping(headers: string[]): Mapping {
  const mapped: Mapping = {}
  for (const field of Object.keys(aliases) as MappingField[]) {
    const matches = headers.filter(h => aliases[field].includes(norm(h)))
    if (matches.length === 1) mapped[field] = matches[0]
  }
  return mapped
}
export function parseMoney(input: unknown): number | null {
  if (input == null || String(input).trim() === '') return null
  let raw = String(input).trim().replace(/,/g, '').replace(/\s/g, '')
  if (/^(n\/a|na|null|—|-)$/i.test(raw)) return null
  let multiplier = 1
  const suffix = raw.match(/(bn|million|billion|thousand|[kmb])$/i)
  if (suffix) {
    const key = suffix[1]!.toLowerCase()
    multiplier = ({ k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 } as Record<string, number>)[key]!
    raw = raw.slice(0, -suffix[0].length)
  }
  raw = raw.replace(/^[£$€]/, '')
  if (!/^\d+(\.\d+)?$/.test(raw)) return null
  const value = Number(raw) * multiplier
  return Number.isSafeInteger(Math.round(value * 100)) && value >= 0 && Number.isInteger(Math.round(value * 100)) ? Math.round(value * 100) / 100 : null
}
export function inspectCsv(csv: string) {
  if (!csv.trim()) throw new DatasetError('The file is empty.')
  const parsed = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.trim() })
  if (parsed.errors.length) throw new DatasetError(`Invalid CSV: ${parsed.errors.slice(0, 3).map(e => `row ${e.row + 2}: ${e.message}`).join('; ')}`)
  const headers = parsed.meta.fields || []
  if (!headers.length || !parsed.data.length) throw new DatasetError('Provide a CSV with a header and at least one company.')
  if (headers.some(h => !h)) throw new DatasetError('CSV headers cannot be empty.')
  if (new Set(headers.map(norm)).size !== headers.length) throw new DatasetError('Duplicate CSV headers found.')
  if (parsed.data.length > 2000) throw new DatasetError('Maximum 2,000 company rows per dataset.')
  return { headers, rows: parsed.data, suggested: suggestMapping(headers) }
}
export function normalizedCompanies(csv: string, mapping: Mapping, currency?: 'GBP' | 'USD' | 'EUR'): Company[] {
  const { headers, rows } = inspectCsv(csv)
  if (!mapping.name || !mapping.fundraising || mapping.name === mapping.fundraising) throw new DatasetError('Map separate company name and fundraising columns.')
  for (const [field, col] of Object.entries(mapping)) if (col && !headers.includes(col)) throw new DatasetError(`Column mapping for ${field} is invalid.`)
  const selected = Object.values(mapping).filter(Boolean)
  if (new Set(selected).size !== selected.length) throw new DatasetError('Each mapped field must use a different CSV column.')
  const companies: Company[] = [], seen = new Set<string>()
  rows.forEach((row, i) => {
    const name = (row[mapping.name!] || '').trim()
    const rawAmount = (row[mapping.fundraising!] || '').trim()
    const symbol = rawAmount.match(/^[£$€]/)?.[0]
    const symbolCurrencies: Record<string, string> = { '£': 'GBP', '$': 'USD', '€': 'EUR' }
    if (currency && symbol && symbolCurrencies[symbol] !== currency) throw new DatasetError(`Row ${i + 2}: detected ${symbol} but selected currency is ${currency}.`)
    const fundraising = parseMoney(rawAmount)
    if (!name || fundraising === null) throw new DatasetError(`Row ${i + 2}: company name or fundraising amount is missing/invalid.`)
    const key = name.toLocaleLowerCase('en-GB')
    if (seen.has(key)) throw new DatasetError(`Row ${i + 2}: duplicate company '${name}'. Resolve duplicates in the source CSV.`)
    seen.add(key)
    const optional = (field: MappingField) => mapping[field] ? (row[mapping[field]!] || '').trim() : ''
    const rawRank = optional('originalRank')
    if (rawRank && !(/^[1-9]\d*$/.test(rawRank) && Number.isSafeInteger(Number(rawRank)))) throw new DatasetError(`Row ${i + 2}: invalid source rank.`)
    const originalRank = rawRank ? Number(rawRank) : undefined
    companies.push({ name, fundraising, ...(optional('website') ? { website: optional('website') } : {}), ...(optional('location') ? { location: optional('location') } : {}), ...(optional('description') ? { description: optional('description') } : {}), ...(optional('stage') ? { stage: optional('stage') } : {}), ...(optional('employees') ? { employees: optional('employees') } : {}), ...(optional('industries') ? { industries: optional('industries') } : {}), ...(originalRank ? { originalRank } : {}) })
  })
  return companies
}
export function rankAndSummarize(companies: Company[], currency: string): { companies: RankedCompany[], stats: Statistics } {
  if (!companies.length) throw new DatasetError('At least one company is required.')
  if (!['GBP', 'USD', 'EUR'].includes(currency)) throw new DatasetError('Supported currencies: GBP, USD, EUR.')
  const hasRanks = companies.every(c => c.originalRank !== undefined)
  if (!hasRanks && companies.some(c => c.originalRank !== undefined)) throw new DatasetError('Source ranks must be provided for every row or omitted for every row.')
  if (hasRanks && new Set(companies.map(c => c.originalRank)).size !== companies.length) throw new DatasetError('Source ranks must be unique.')
  const sorted = [...companies].sort((a, b) => hasRanks ? a.originalRank! - b.originalRank! : b.fundraising - a.fundraising || a.name.localeCompare(b.name))
  const ranked = sorted.map((company, i) => ({ ...company, rank: hasRanks ? company.originalRank! : i + 1 }))
  const sum = sorted.reduce((total, c) => total + Math.round(c.fundraising * 100), 0) / 100
  const amounts = sorted.map(c => c.fundraising).sort((a, b) => a - b)
  const middle = Math.floor(amounts.length / 2)
  const median = amounts.length % 2 ? amounts[middle]! : (amounts[middle - 1]! + amounts[middle]!) / 2
  const byFunding = [...sorted].sort((a, b) => b.fundraising - a.fundraising)
  const topTen = byFunding.slice(0, 10).reduce((total, c) => total + Math.round(c.fundraising * 100), 0) / 100
  return { companies: ranked, stats: {
    count: ranked.length, total: sum, average: sum / ranked.length, median,
    highest: byFunding[0]!.fundraising, lowest: byFunding.at(-1)!.fundraising,
    topTenShare: sum > 0 ? Math.min(100, Math.max(0, topTen / sum * 100)) : 0,
    topCompany: byFunding[0]!.name, currency
  } }
}
