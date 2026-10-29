import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { inspectCsv, normalizedCompanies, parseMoney, rankAndSummarize, DatasetError } from '../server/utils/dataset'
const sample = 'Company Name,Total Fundraising,Location\n"Example, Ltd",£2m,London\nBravo,£4m,Leeds\nCharlie,£0,Oxford'
const mapping = { name: 'Company Name', fundraising: 'Total Fundraising', location: 'Location' }
describe('CSV inspection', () => {
  it('detects header aliases and quoted commas', () => { const p = inspectCsv(sample); expect(p.rows).toHaveLength(3); expect(p.rows[0]?.['Company Name']).toBe('Example, Ltd'); expect(p.suggested).toMatchObject(mapping) })
  it('rejects empty CSV', () => expect(() => inspectCsv('')).toThrow(DatasetError))
  it('rejects malformed input', () => expect(() => inspectCsv('Name,Funding\n"unterminated,10')).toThrow(DatasetError))
  it('rejects invalid mapping', () => expect(() => normalizedCompanies(sample, { name: 'x', fundraising: 'Total Fundraising' })).toThrow(DatasetError))
  it('rejects duplicates', () => expect(() => normalizedCompanies('Name,Funding\nACME,12\nacme,20', { name: 'Name', fundraising: 'Funding' })).toThrow(/duplicate/i))
  it('rejects a currency-symbol mismatch', () => expect(() => normalizedCompanies('Name,Funding\nACME,£20', { name: 'Name', fundraising: 'Funding' }, 'USD')).toThrow(/currency/i))
  it('rejects missing amounts', () => expect(() => normalizedCompanies('Name,Funding\nACME,', { name: 'Name', fundraising: 'Funding' })).toThrow(/invalid/i))
})
describe('fundraising analysis', () => {
  it('parses supported formats', () => { expect(parseMoney('£1,250,000')).toBe(1250000); expect(parseMoney('3.5m')).toBe(3500000); expect(parseMoney('0')).toBe(0); expect(parseMoney('unknown')).toBeNull(); expect(parseMoney('-100')).toBeNull() })
  it('produces deterministic ranking, sum, median and average', () => {
    const { companies, stats } = rankAndSummarize(normalizedCompanies(sample, mapping), 'GBP')
    expect(companies.map(c => c.name)).toEqual(['Bravo', 'Example, Ltd', 'Charlie'])
    expect(stats).toMatchObject({ count: 3, total: 6000000, average: 2000000, median: 2000000, highest: 4000000, lowest: 0, topTenShare: 100 })
  })
})


describe('source dataset preservation', () => {
  it('maps Beauhurst-specific columns without hardcoding any companies', () => {
    const csv = 'Rank,Company,Region,Stage,Employees,Total Raised,Description,Website,Industries\n1,Nevis,London,Seed,5-9,"£30,314,247",Wealth platform,https://example.com,Wealth management'
    const { suggested } = inspectCsv(csv)
    const data = normalizedCompanies(csv, suggested, 'GBP')
    expect(data).toHaveLength(1)
    expect(data[0]).toMatchObject({ name: 'Nevis', location: 'London', stage: 'Seed', employees: '5-9', industries: 'Wealth management', fundraising: 30314247, originalRank: 1 })
  })
  it('rejects mapping one CSV column to multiple fields', () => {
    expect(() => normalizedCompanies('Company,Total Raised\nA,123', { name: 'Company', fundraising: 'Total Raised', location: 'Company' }, 'GBP')).toThrow(/different CSV column/)
  })
  it('rejects a currency mismatch instead of silently combining currencies', () => {
    expect(() => normalizedCompanies('Company,Total Raised\nA,$123', { name: 'Company', fundraising: 'Total Raised' }, 'GBP')).toThrow(/selected currency/)
  })
})


describe('official Beauhurst 100-company CSV integration fixture', () => {
  const officialCsv = readFileSync(new URL('../examples/OFFICIAL_fintech_companies_seed.csv', import.meta.url), 'utf8')
  it('recognizes actual source headers and parses all 100 companies', () => {
    const { headers, rows, suggested } = inspectCsv(officialCsv)
    expect(headers).toEqual(['Rank', 'Company', 'Region', 'Stage', 'Employees', 'Total Raised', 'Description', 'Website', 'Industries'])
    expect(rows).toHaveLength(100)
    const companies = normalizedCompanies(officialCsv, suggested, 'GBP')
    expect(companies).toHaveLength(100)
    expect(companies[0]).toMatchObject({ name: 'Nevis', fundraising: 30314247, originalRank: 1 })
    expect(companies[99]).toMatchObject({ name: 'Ledger Rocket', fundraising: 2000000, originalRank: 100 })
  })
  it('computes the independently checked financing figures without hardcoded application data', () => {
    const { suggested } = inspectCsv(officialCsv)
    const { companies, stats } = rankAndSummarize(normalizedCompanies(officialCsv, suggested, 'GBP'), 'GBP')
    expect(companies).toHaveLength(100)
    expect(companies.map(c => c.originalRank)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1))
    expect(stats.count).toBe(100)
    expect(stats.total).toBe(622301270)
    expect(stats.average).toBe(6223012.7)
    expect(stats.median).toBe(4146786)
    expect(stats.highest).toBe(30314247)
    expect(stats.lowest).toBe(2000000)
    expect(stats.topCompany).toBe('Nevis')
  })
})

describe('source ranking and monetary precision', () => {
  it('preserves authoritative source order even when fundraising is not descending', () => {
    const csv = 'Rank,Company,Funding\n1,Alpha,£10\n2,Beta,£20'
    const rows = normalizedCompanies(csv, { originalRank: 'Rank', name: 'Company', fundraising: 'Funding' }, 'GBP')
    const result = rankAndSummarize(rows, 'GBP')
    expect(result.companies.map(c => c.name)).toEqual(['Alpha', 'Beta'])
    expect(result.stats.topCompany).toBe('Beta')
  })
  it('rejects duplicated or incomplete source ranks', () => {
    expect(() => rankAndSummarize([{ name: 'A', fundraising: 1, originalRank: 1 }, { name: 'B', fundraising: 2, originalRank: 1 }], 'GBP')).toThrow(/unique/)
    expect(() => rankAndSummarize([{ name: 'A', fundraising: 1, originalRank: 1 }, { name: 'B', fundraising: 2 }], 'GBP')).toThrow(/every row/)
  })
  it('adds decimal fundraising exactly to pennies', () => {
    const result = rankAndSummarize([{name:'A', fundraising: 0.1}, {name:'B', fundraising: 0.2}], 'GBP')
    expect(result.stats.total).toBe(0.3)
  })
})
