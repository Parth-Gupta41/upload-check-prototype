import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { analyzeText } from '../src/engine/analyze'
const f = (n: string) => `tests/fixtures/${n}`
const run = (n: string) => { const t = readFileSync(f(n), 'utf8'); return analyzeText(t, n, t.length) }
describe('real files', () => {
  it.runIf(existsSync(f('yelp.csv')))('yelp matches Databricks', () => {
    const r = run('yelp.csv')
    expect(r.A.rows).toBe(29307); expect(r.A.bad).toBe(24485)
    expect(r.B.rows).toBe(10000); expect(r.B.bad).toBe(0)
    const s = r.B.header.indexOf('stars')
    expect(+(r.B.numSum[s] / r.B.numCount[s]).toFixed(2)).toBe(3.78)
    expect(+(r.A.numSum[s] / r.A.numCount[s]).toFixed(2)).toBe(3.3)
  })
  it.runIf(existsSync(f('messy_store_sales.csv')))('store sales test file', () => {
    const r = run('messy_store_sales.csv')
    expect(r.A.rows).toBe(125); expect(r.B.rows).toBe(120)
  })
})
