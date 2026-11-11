import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { parseLine, readerA, readerB, normalize } from '../src/engine/csv'
import { analyzeText, fixIsSafe, combineHeader } from '../src/engine/analyze'
import { finalColumns, NO_FIXES } from '../src/engine/table'
import { SCENARIOS, scenarioText } from '../src/scenarios'
import { copy, clip } from '../src/copy'

const an = (t: string, o = {}) => analyzeText(t, 'f.csv', t.length, o)

describe('reader A (default)', () => {
  it('drops blank lines and lets quotes not span lines', () => {
    const r = readerA(normalize('a,b\n1,"x\ny"\n\n2,z\n'))
    expect(r.rows).toEqual([['1', 'x'], ['y"'], ['2', 'z']])
  })
  it('unterminated quote runs to end of line; doubled quotes are literal', () => {
    expect(parseLine('1,"abc,def')).toEqual(['1', 'abc,def'])
    expect(parseLine('1,"say ""hi""",3')).toEqual(['1', 'say "hi"', '3'])
  })
  it('handles CRLF', () => {
    expect(readerA(normalize('a,b\r\n1,2\r\n')).rows).toEqual([['1', '2']])
  })
})

describe('reader B (line breaks kept)', () => {
  it('keeps newlines and commas inside quotes', () => {
    const r = readerB(normalize('a,b\n1,"x\n\ny, z"\n2,w\n'))
    expect(r.rows).toEqual([['1', 'x\n\ny, z'], ['2', 'w']])
  })
  it('skips empty records and a trailing newline', () => {
    expect(readerB(normalize('a\n\n1\n\n')).rows).toEqual([['1']])
  })
})

describe('detection and guard', () => {
  it('clean file is clean', () => expect(an('a,b\n1,2\n3,4\n').rowState).toBe('clean'))
  it('split rows are fixable with an example', () => {
    const r = an('id,txt,n\n1,"one\ntwo",5\n2,ok,6\n')
    expect(r.rowState).toBe('fixable')
    expect(r.A.rows).toBe(3); expect(r.B.rows).toBe(2)
    expect(r.example).toEqual({ recordNo: 1, parts: ['1,"one', 'two",5'] })
  })
  it('guard rejects a fix that collapses rows', () => {
    expect(fixIsSafe({ bad: 1, good: 151670 }, { bad: 1, good: 9 })).toBe(false)
    expect(fixIsSafe({ bad: 24485, good: 4822 }, { bad: 0, good: 10000 })).toBe(true)
    expect(fixIsSafe({ bad: 202, good: 3711 }, { bad: 0, good: 3660 })).toBe(true)
  })
})

describe('columns', () => {
  it('finds blank, duplicate and comma names', () => {
    const c = an('a,,"b, c",A\n1,2,3,4\n').columnsA
    expect(c.blank).toEqual([1])
    expect(c.duplicates.map((d) => d.idx)).toEqual([3])
    expect(c.comma.map((d) => d.suggestion)).toEqual(['b_c'])
  })
  it('today drops blank and duplicate columns; proposed keeps them when asked', () => {
    const r = an('a,,b,A\n1,2,3,4\n')
    expect(finalColumns(r, NO_FIXES, 'today', false).cols.map((c) => c.name)).toEqual(['a', 'b'])
    expect(finalColumns(r, { ...NO_FIXES, keepBlank: true, keepDuplicates: true }, 'proposed', false).cols.map((c) => c.name)).toEqual(['a', 'column_2', 'b', 'a_2'])
  })
  it('excel emulation names blanks _cN', () => {
    const r = an('Title,,\nx,y,z\n')
    expect(finalColumns(r, NO_FIXES, 'today', true).cols.map((c) => c.name)).toEqual(['Title', '_c1', '_c2'])
  })
  it('combines a second label row', () => {
    expect(combineHeader(['id', 'Q1', '', ''], ['', 'A', 'B', 'C'])).toEqual(['id', 'Q1: A', 'Q1: B', 'Q1: C'])
  })
})

describe('scenarios reproduce their ground truth', () => {
  for (const s of SCENARIOS) {
    it(s.id, () => {
      const { truth } = s.build()
      const r = an(scenarioText(s.id))
      expect(r.A.rows).toBe(truth.readerARows)
      if (s.id !== 'stray') expect(r.B.rows).toBe(truth.records)
    })
  }
  it('sales: 120 records become 125 rows, with a duplicate and a comma name', () => {
    const r = an(scenarioText('sales'))
    expect([r.A.rows, r.B.rows, r.rowState]).toEqual([125, 120, 'fixable'])
    expect(r.columnsA.duplicates.length).toBe(1)
    expect(r.columnsA.comma[0].name).toBe('Store, Location')
  })
  it('survey: row 2 labels, not a header problem', () => {
    const r = an(scenarioText('survey'))
    expect(r.columnsA.row2Labels).toBe(true)
    expect(r.columnsA.headerSuspect).toBeNull()
  })
  it('population: header suspect pointing at the real header', () => {
    const c = an(scenarioText('population')).columnsA
    expect(c.headerSuspect?.suggestedRow).toBe(3)
    const fixed = an(scenarioText('population'), { headerRow: 3 })
    expect(fixed.A.header[0]).toBe('Geographic area')
    expect(fixed.A.rows).toBe(52)
  })
  it('clean stays clean; stray is guarded', () => {
    expect(an(scenarioText('clean')).rowState).toBe('clean')
    expect(an(scenarioText('stray')).rowState).toBe('guard')
  })
})

describe('copy rules', () => {
  it('no dashes, banned words or exclamation marks in UI copy', () => {
    const files = ['src/copy.ts', 'src/pages/Upload.tsx', 'src/pages/Table.tsx', 'src/pages/Guide.tsx', 'src/pages/About.tsx', 'src/components/Shell.tsx', 'src/components/EventLog.tsx']
    for (const f of files) {
      const t = readFileSync(f, 'utf8').replace("todayBlocked: 'Please fix errors to continue'", '').replace(/"Please fix errors to continue"/g, '')
      expect(t, f).not.toMatch(/[—–]/)
      expect(t, f).not.toMatch(/\b(successfully|corrupt|corruption|simply)\b/i)
      expect(t, f).not.toMatch(/\bplease\b/i)
      expect(t, f).not.toMatch(/integrity verification/i)
    }
  })
})

describe('copy helpers', () => {
  it('describes blank-column ranges honestly', () => {
    expect(copy.keepBlank([4])).toBe('Keep it as column_4')
    expect(copy.keepBlank([4, 5, 6])).toBe('Keep them as column_4 to column_6')
    expect(copy.keepBlank([4, 5, 6, 7, 8, 10, 11, 12, 13, 14])).toBe('Keep all 10 as column_4, column_5 and so on')
  })
  it('uses the singular for one row', () => {
    expect(copy.modalRowsBad(1)).toBe("1 row didn't read cleanly.")
    expect(copy.receiptAsIsNoCount('a.csv', 5000, 1)).toContain("1 row didn't read cleanly.")
    expect(copy.modalRowsBad(3942)).toBe("3,942 rows didn't read cleanly.")
  })
  it('cuts very long names', () => {
    const long = 'Table_1_Annual_estimates_of_the_resident_population_for_the_United_States'
    expect(clip(long).length).toBe(60)
    expect(clip('short')).toBe('short')
  })
})
