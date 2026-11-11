// Every user-facing sentence of the check lives here, so the copy rules can be tested.
const n = (x: number) => x.toLocaleString('en-US')
const s = (x: number, one: string, many: string) => (x === 1 ? one : many)
// Long generated names (a title sentence used as a header) are cut so messages stay readable.
export const clip = (t: string, max = 60) => (t.length > max ? t.slice(0, max - 3).trimEnd() + '...' : t)

export const copy = {
  banner: 'Concept prototype for a PRD. Not a Databricks product.',
  product: 'Data workspace (concept)',
  privacy: 'Files stay in your browser. Nothing is uploaded.',

  checking: 'Checking your whole file...',
  checkedIn: (rows: number, ms: number) => `Checked ${n(rows)} rows in ${ms < 1 ? '<1' : n(Math.round(ms))} ms in your browser.`,

  okMatch: (rows: number, cols: number) => `${n(rows)} rows, matching your file. All ${n(cols)} columns kept.`,
  okMatchSome: (rows: number, cols: number) => `${n(rows)} rows, matching your file. ${n(cols)} ${s(cols, 'column', 'columns')}.`,
  okFixed: 'Line breaks kept inside cells.',
  undo: 'Undo',
  leftover: (k: number) => `${n(k)} ${s(k, "row still doesn't", "rows still don't")} fit the columns.`,
  view: (k: number) => (k === 1 ? 'View it' : 'View them'),

  wontMatch: "This table won't match your file",
  mayNotMatch: 'This table may not match your file',
  rowsCompare: (fileRows: number, tableRows: number) => `Your file has ${n(fileRows)} rows. This table would have ${n(tableRows)}.`,
  rowsCause: 'Some cells contain line breaks, so those rows were split.',
  example: (recordNo: number, k: number) => `Example: row ${n(recordNo)} of your file became ${n(k)} rows`,
  fixRows: 'Keep line breaks inside cells',
  settingName: 'Setting: Rows span multiple lines',
  viewBad: (k: number) => `View rows that didn't read cleanly (${n(k)})`,
  guardRows: (k: number) => `${n(k)} ${s(k, "row doesn't", "rows don't")} fit the columns.`,
  guardWhy: (after: number, before: number) => `Keeping line breaks inside cells would turn ${n(before)} rows into ${n(after)}, so that fix isn't offered.`,
  madeWorse: (after: number, before: number) => `That made it worse: ${n(after)} rows instead of ${n(before)}. We undid it.`,

  columns: 'Columns',
  blankCols: (k: number) => `${n(k)} ${s(k, 'column has no name and will be dropped.', 'columns have no name and will be dropped.')}`,
  keepBlank: (positions: number[]) => {
    const k = positions.length, first = positions[0], last = positions[k - 1]
    if (k === 1) return `Keep it as column_${first}`
    if (last - first + 1 === k) return `Keep them as column_${first} to column_${last}`
    return `Keep all ${n(k)} as column_${first}, column_${positions[1]} and so on`
  },
  row2Hint: 'Row 2 looks like their labels.',
  row2Action: 'Name them from row 2',
  dupCols: (name: string) => `1 column name is used twice: ${name}. The second one will be dropped.`,
  dupColsMany: (k: number) => `${n(k)} column names are used twice. The repeats will be dropped.`,
  keepDup: (base: string) => `Keep both as ${base} and ${base}_2`,
  keepDupMany: 'Keep all of them',
  commaCol: (name: string) => `1 column name can't be used: ${clip(name)}`,
  commaColMany: (k: number) => `${n(k)} column names can't be used because they contain commas.`,
  renameTo: 'Rename to',
  rename: 'Rename',
  renameAll: (example: string) => `Rename all (for example, ${example})`,
  headerSuspect: (blank: number, total: number) => `Your first row doesn't look like column names: ${n(blank)} of ${n(total)} are blank.`,
  headerAsk: 'Is your header on another row?',
  useRow: 'Use as header',

  modalRowsTitle: "Create a table that doesn't match your file?",
  modalRowsBody: (tableRows: number, fileRows: number) => `Your table will have ${n(tableRows)} rows, not ${n(fileRows)}.`,
  modalRowsBad: (k: number) => `${n(k)} ${s(k, "row didn't", "rows didn't")} read cleanly.`,
  modalColsDropped: (k: number) => `${n(k)} ${s(k, 'column', 'columns')} will be dropped.`,
  modalCommaTitle: "A column name can't be used",
  modalComma: (name: string, to: string) => `${clip(name)} will be renamed to ${clip(to)}${to.length > 60 ? '' : '.'}`,
  fixAndCreate: 'Fix and create',
  keepAndCreate: 'Keep columns and create',
  createAsIs: 'Create as is',
  renameAndCreate: 'Rename and create',
  cancel: 'Cancel',

  receiptOk: (file: string, date: string, rows: number, cols: number) => `Created from ${file} on ${date}. ${n(rows)} rows, matching your file. ${n(cols)} columns.`,
  receiptAsIs: (file: string, rows: number, fileRows: number, bad: number) => `Created as is from ${file}: ${n(rows)} rows from a ${n(fileRows)}-row file. ${n(bad)} ${s(bad, "row didn't", "rows didn't")} read cleanly.`,
  receiptAsIsNoCount: (file: string, rows: number, bad: number) => `Created as is from ${file}: ${n(rows)} rows. ${n(bad)} ${s(bad, "row didn't", "rows didn't")} read cleanly.`,
  receiptHeader: (file: string, rows: number) => `Created as is from ${file}: ${n(rows)} rows. The header row wasn't confirmed, so column names may be wrong.`,
  receiptDropped: (k: number) => `${n(k)} ${s(k, 'column was', 'columns were')} dropped.`,
  receiptRenamed: (from: string, to: string) => `Renamed ${clip(from)} to ${clip(to)}${to.length > 60 ? '' : '.'}`,
  seeCheck: 'See upload check',
  quickCheck: 'Quick check',
  quickCheckNote: 'Demo aid, not part of the proposed feature.',
  todayDescription: (topic: string) => `This table contains ${topic}. Possible uses include analyzing trends and building reports for your team.`,
  simNote: 'Simulates the kind of suggestion observed in a trial workspace.',
  todayBlocked: 'Please fix errors to continue',
  copied: 'Copied',
  copyFailed: "Couldn't copy",
}
