// Deterministic demo files. No third-party data ships with the app.

export interface Scenario {
  id: string
  title: string
  fileName: string
  blurb: string
  metricColumn?: string
  emulateExcel?: boolean
  build: () => { text: string; truth: { records: number; readerARows: number } }
}

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)]
const q = (s: string) => '"' + s.replace(/"/g, '""') + '"'
const needsQuote = (s: string) => /[",\n]/.test(s)
const cell = (s: string) => (needsQuote(s) ? q(s) : s)
const line = (cells: string[]) => cells.map(cell).join(',')
/** count non-blank physical lines a record will occupy */
const physLines = (l: string) => l.split('\n').filter((x) => x.trim() !== '').length
const pad = (n: number, w: number) => String(n).padStart(w, '0')

const SENT = [
  'We came for brunch and stayed for the coffee.',
  'The staff remembered our order from last time, which was a nice touch.',
  'Parking was hard to find, but the walk was short.',
  'Portions were generous and the prices felt fair.',
  'The pancakes were the best part, light and not too sweet.',
  'Service was slow on a busy Saturday, but friendly.',
  'I would come back for the patio alone.',
  'The music was a little loud for conversation.',
  'Our server suggested the special and it was worth it.',
  'Clean tables, quick refills, no complaints.',
  'The menu says "house made", and you can taste it.',
  'Not cheap, but you get what you pay for.',
]

function reviews() {
  const r = rng(42)
  const out = [line(['review_id', 'business_id', 'date', 'stars', 'text', 'type', 'user_id', 'cool', 'useful', 'funny'])]
  let aRows = 0
  const N = 2000
  for (let i = 1; i <= N; i++) {
    const stars = (() => { const x = r(); return x < 0.08 ? 1 : x < 0.18 ? 2 : x < 0.33 ? 3 : x < 0.68 ? 4 : 5 })()
    const nPara = r() < 0.55 ? 2 + Math.floor(r() * 4) : 1
    const paras: string[] = []
    for (let p = 0; p < nPara; p++) {
      const k = 1 + Math.floor(r() * 3)
      paras.push(Array.from({ length: k }, () => pick(r, SENT)).join(' '))
    }
    const text = paras.join(r() < 0.5 ? '\n\n' : '\n')
    const d = new Date(Date.UTC(2023, 0, 1) + Math.floor(r() * 700) * 86400000).toISOString().slice(0, 10)
    const l = line([
      'r_' + pad(i, 6), 'b_' + pad(1 + Math.floor(r() * 900), 4), d, String(stars), text, 'review',
      'u_' + pad(1 + Math.floor(r() * 5000), 5), String(Math.floor(r() * 4)), String(Math.floor(r() * 6)), String(Math.floor(r() * 3)),
    ])
    aRows += physLines(l)
    out.push(l)
  }
  return { text: out.join('\n') + '\n', truth: { records: N, readerARows: aRows } }
}

function survey() {
  const r = rng(7)
  const genres = ['Drama', 'Comedy', 'Documentary', 'Science fiction', 'Animation', 'Reality']
  const h1 = ['RespondentID', 'Do you watch at least one show a week?', 'Which genres have you watched, if any?', ...Array(genres.length - 1).fill(''),
    'Rank each genre from 1 (favorite) to 6', ...Array(genres.length - 1).fill(''), 'Age', 'Region']
  const h2 = ['', 'Response', ...genres, ...genres, 'Response', 'Response']
  const out = [line(h1), line(h2)]
  const N = 300
  for (let i = 1; i <= N; i++) {
    const watches = r() < 0.8
    const seen = genres.map((g) => (watches && r() < 0.6 ? g : ''))
    const ranks = [1, 2, 3, 4, 5, 6].sort(() => r() - 0.5).map((x) => (watches ? String(x) : ''))
    out.push(line([String(3290000000 + i), watches ? 'Yes' : 'No', ...seen, ...ranks, pick(r, ['18-29', '30-44', '45-60', '> 60']), pick(r, ['Northeast', 'Midwest', 'South', 'West'])]))
  }
  return { text: out.join('\n') + '\n', truth: { records: N + 1, readerARows: N + 1 } }
}

function sales() {
  const r = rng(11)
  const stores = ['Brooklyn, NY', 'Queens, NY', 'Manhattan, NY', 'Jersey City, NJ']
  const products = ['Bagel', 'Croissant', 'Muffin', 'Latte', 'Cold brew', 'Scone']
  const out = [line(['Order ID', 'Order Date', 'Store, Location', 'Product Name', 'Units (#)', 'Price $', 'Notes', 'order id'])]
  const N = 120
  const multi = new Set([23, 46, 69, 92, 115])
  const blanksAfter = new Set([30, 60, 90])
  let aRows = 0
  for (let i = 1; i <= N; i++) {
    const notes = multi.has(i) ? 'line one of the note\nline two of the note' : r() < 0.2 ? 'Gift wrap' : ''
    const d = new Date(Date.UTC(2026, 2, 1) + Math.floor(r() * 60) * 86400000).toISOString().slice(0, 10)
    const l = line([String(i), d, pick(r, stores), pick(r, products), String(1 + Math.floor(r() * 6)), (2 + r() * 6).toFixed(2), notes, 'A' + pad(i, 4)])
    aRows += physLines(l)
    out.push(l)
    if (blanksAfter.has(i)) out.push('')
  }
  return { text: out.join('\n') + '\n', truth: { records: N, readerARows: aRows } }
}

const STATES = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming', 'Puerto Rico']

function population() {
  const r = rng(3)
  const out = [
    line(['Table 1. Annual estimates of the resident population for the United States, regions and states (synthetic demo data)', '', '', '', '', '', '', '']),
    line(['Figures are invented for this prototype', '', '', '', '', '', '', '']),
    '',
    line(['Geographic area', 'April 1 2020 base', '2020', '2021', '2022', '2023', '2024', '2025']),
  ]
  for (const s of STATES) {
    let v = Math.floor(500000 + r() * 30000000)
    const vals = [v]
    for (let y = 0; y < 6; y++) { v = Math.floor(v * (0.995 + r() * 0.02)); vals.push(v) }
    out.push(line([s, ...vals.map((x) => x.toLocaleString('en-US'))]))
  }
  return { text: out.join('\n') + '\n', truth: { records: STATES.length + 2, readerARows: STATES.length + 2 } }
}

function clean() {
  const r = rng(5)
  const out = [line(['order_id', 'order_date', 'customer_id', 'product', 'quantity', 'amount'])]
  const N = 500
  for (let i = 1; i <= N; i++) {
    const d = new Date(Date.UTC(2026, 0, 1) + Math.floor(r() * 300) * 86400000).toISOString().slice(0, 10)
    out.push(line([String(10000 + i), d, 'c_' + pad(1 + Math.floor(r() * 800), 4), pick(r, ['Notebook', 'Pen set', 'Desk lamp', 'Backpack', 'Mug']), String(1 + Math.floor(r() * 5)), (5 + r() * 120).toFixed(2)]))
  }
  return { text: out.join('\n') + '\n', truth: { records: N, readerARows: N } }
}

function stray() {
  const r = rng(9)
  const first = ['Ana', 'Ben', 'Chen', 'Dara', 'Eli', 'Fatima', 'Gus', 'Hana', 'Ivan', 'Jo']
  const last = ['Garcia', 'Smith', 'Nguyen', 'Patel', 'Kim', 'Okafor', 'Rossi', 'Cohen']
  const out = [line(['id', 'first_name', 'last_name', 'city', 'score'])]
  const N = 5000
  for (let i = 1; i <= N; i++) {
    const fn = i === 11 ? '"' + pick(r, first) : pick(r, first)
    out.push([String(i), fn, pick(r, last), pick(r, ['Austin', 'Boston', 'Denver', 'Seattle']), String(Math.floor(r() * 100))].join(','))
  }
  return { text: out.join('\n') + '\n', truth: { records: N, readerARows: N } }
}

export const SCENARIOS: Scenario[] = [
  { id: 'reviews', title: 'Customer reviews', fileName: 'customer_reviews.csv', blurb: 'Reviews with line breaks inside them. Watch the row count.', metricColumn: 'stars', build: reviews },
  { id: 'survey', title: 'Survey export', fileName: 'survey_export.csv', blurb: 'Blank column names, a second header row, and a comma in one name.', build: survey },
  { id: 'sales', title: 'Store sales', fileName: 'store_sales.csv', blurb: 'Like the test file from the PRD: 120 records, one duplicate column.', metricColumn: 'Units (#)', build: sales },
  { id: 'population', title: 'Population report', fileName: 'population_report.csv', blurb: 'A title row sits above the real header.', emulateExcel: true, build: population },
  { id: 'clean', title: 'Clean file', fileName: 'clean_orders.csv', blurb: 'Nothing wrong. The check should stay quiet.', metricColumn: 'amount', build: clean },
  { id: 'stray', title: 'Stray quote', fileName: 'stray_quote.csv', blurb: "One bad quote. The fix would make things worse, so it isn't offered.", metricColumn: 'score', build: stray },
]

const cache = new Map<string, string>()
export function scenarioText(id: string): string {
  if (!cache.has(id)) cache.set(id, SCENARIOS.find((s) => s.id === id)!.build().text)
  return cache.get(id)!
}
