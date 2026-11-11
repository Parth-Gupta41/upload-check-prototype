const MAP = {
  activities: ['Get the file', 'Bring it in', 'Check it came through right', "Fix what's off", 'Create the table', 'Use and share it'],
  steps: [
    ['Receive the export', 'Open it'],
    ['Open the upload screen', 'Drop the file', 'Pick catalog, schema, name'],
    ['Read the preview', 'See the check', 'See an example', 'See leftovers'],
    ['Fix split rows', 'Fix column names', 'Pick the header row'],
    ['Name the table', 'Click Create', 'Confirm if a problem is open'],
    ['Open the table', 'Run a quick check', 'Hand it off'],
  ],
  slices: [
    { name: 'Prototype MVP', mvp: true, cells: ['Pick a demo file or own CSV', 'Drop zone; files stay in the browser', 'Whole-file check; counts in Excel terms; example split row; quiet line on clean files', 'One-click fix, rechecked, with undo; guard if it makes things worse; inline rename; keep blank and repeated columns', 'Confirm once for an open confirmed problem; rename and create for commas', 'Table page with receipt; quick check (demo); event log'] },
    { name: 'Release 2', mvp: false, cells: ['', '.xlsx support', '"May not match" note when the header looks wrong', 'Header row picker; name columns from row 2', '', 'Receipt in the table description'] },
    { name: 'Later', mvp: false, cells: ['', 'Same check for volumes and Genie file upload', 'AI explanation of why rows broke', 'Remember the fix for files from the same source', '', 'Warn in Genie when a table was created as is'] },
  ],
}

export function AboutPage() {
  return (
    <div className="prose">
      <h1>About this prototype</h1>
      <p className="lede">A concept for the Databricks "Create or modify a table" upload screen, built to go with a product requirements document. It is not a Databricks product.</p>

      <h2>The problem</h2>
      <p>The upload screen can create a table that doesn't match the uploaded file, and nothing on the screen says so. By default, a line break inside a quoted cell starts a new row. The setting that fixes this, "Rows span multiple lines", is off by default under Advanced attributes. Blank or repeated column names cause columns to be dropped. A comma in a column name blocks Create with "Please fix errors to continue", without saying which column. The preview shows 50 rows as they were read and never compares the table with the file.</p>

      <h2>Who it's for</h2>
      <p><strong>Maya</strong> (a composite) is a junior data analyst six weeks into the job. She knows Excel and basic SQL, doesn't write pipelines, and uses the upload screen for files her manager forwards. She thinks in Excel terms ("my file has 10,000 rows") and usually finds problems late, when someone questions a number.</p>
      <ul>
        <li><strong>Ana</strong>, an analytics manager, opens tables other people made and needs to know whether to trust them.</li>
        <li><strong>Priya</strong>, a data engineer, knows the setting and doesn't want to be slowed down.</li>
        <li><strong>Luis</strong>, a Free Edition learner, follows tutorial screenshots step by step.</li>
      </ul>

      <h2>Jobs to be done</h2>
      <p>When her manager sends a file and wants an answer by Friday, Maya wants to turn it into a table with the same rows and columns, answer the question from it, and know before building anything that it came through right. She wants her numbers to be trusted, and she wants to find any mistake before her manager does.</p>
      <table><thead><tr><th>Pain (most intense first)</th><th>What the prototype does</th></tr></thead><tbody>
        <tr><td>The table is wrong and nothing says so</td><td>Checks the whole file and says whether the table matches, in her units</td></tr>
        <tr><td>A 50-row preview can't show problems further down</td><td>Counts every row, not just the preview</td></tr>
        <tr><td>A blocked Create doesn't say which column</td><td>Names the column and offers a rename</td></tr>
        <tr><td>The fix is hidden under a name she wouldn't recognize</td><td>Offers it as one button, and names the setting for experts</td></tr>
      </tbody></table>

      <h2>Story map</h2>
      <div className="storymap">
        <table>
          <thead><tr><th></th>{MAP.activities.map((a) => <th key={a}>{a}</th>)}</tr></thead>
          <tbody>
            <tr><td className="slice">Steps</td>{MAP.steps.map((s, i) => <td key={i}>{s.join(' · ')}</td>)}</tr>
            {MAP.slices.map((s) => <tr key={s.name} className={s.mvp ? 'mvp' : ''}><td className="slice">{s.name}</td>{s.cells.map((c, i) => <td key={i}>{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>

      <h2>How the prototype behaves</h2>
      <ul>
        <li>It checks the whole file, not the preview, and says the result in the user's units.</li>
        <li>It shows one real example of a record that was split into several rows.</li>
        <li>It never fixes anything automatically. The fix is offered only when rows don't fit and only if it helps; the numbers are rechecked afterwards.</li>
        <li>It never blocks Create. It asks once when a confirmed problem is still open. A comma in a column name gets a rename, because the platform can't accept it.</li>
        <li>It has two levels only: "won't match" with numbers and a fix, and "may not match" as a note.</li>
        <li>It claims only what it checked: "matching your file", never "your data looks good".</li>
        <li>Clean files get one quiet line and nothing to click.</li>
        <li>Every table created keeps a receipt that says whether it matched, including "created as is".</li>
      </ul>

      <h2>Evidence</h2>
      <p>Observed firsthand in a Databricks free trial workspace in November 2026:</p>
      <table><thead><tr><th>File</th><th>What Databricks produced</th></tr></thead><tbody>
        <tr><td>Yelp reviews, 10,000 records</td><td>29,307 rows; a plain average of the rating column gave 3.3 instead of 3.78; the preview looked normal and Create stayed enabled</td></tr>
        <tr><td>Survey export, 38 columns</td><td>15 columns (23 had blank names); the second header row was read as data; Create was blocked without saying why</td></tr>
        <tr><td>Census population (.xlsx)</td><td>The title sentence became a column name, other columns were named _c1 to _c7, numbers were read as text</td></tr>
        <tr><td>Store sales test file, 120 records</td><td>125 rows; a repeated column was dropped</td></tr>
      </tbody></table>
      <p>These files were chosen because they were likely to break, so they show the failure is real, not how often it happens. In a scan of 503 public CSVs from FiveThirtyEight, this prototype's reader found 12 with line breaks inside cells, and the fix recovered the exact record count in all 12. In several of them the first broken row came after row 50, beyond the preview. Forcing the setting on a clean file with one stray quote turned 151,671 rows into 10, which is why the fix is guarded.</p>

      <h2>How we'd measure it</h2>
      <ul>
        <li><strong>Primary:</strong> the share of upload-created tables that contain misread rows. Should fall.</li>
        <li><strong>Secondary:</strong> the share of flagged uploads that are fixed rather than created as is.</li>
        <li><strong>Lagging:</strong> tables replaced within 24 hours of upload. Should fall.</li>
        <li><strong>Guardrails:</strong> time to create and abandonment on files that aren't flagged stay flat; the "create as is" rate shows whether warnings are trusted.</li>
      </ul>
      <p>Open the event log from the banner to see the events that feed these.</p>

      <h2>Not in version one</h2>
      <ul>
        <li>Formats other than CSV, and other ingestion paths such as notebooks, volumes and Genie file upload.</li>
        <li>One-click fixes for wrong delimiters or encodings.</li>
        <li>Turning the line-break setting on by default.</li>
        <li>Promises about Genie answers. Correct tables are a prerequisite for correct answers, not a guarantee.</li>
      </ul>

      <h2>How this prototype works, and its limits</h2>
      <p>Everything runs in your browser. Two readers process every file: one reads each line as a row (the default), the other keeps line breaks inside quoted cells (the setting turned on). The default reader was checked against a Databricks trial workspace and reproduces its numbers on the Yelp sample exactly. The demo files are synthetic. Speed in a browser is not a measure of speed on the real platform. The personas are composites, and the warning wording still needs testing with real analysts.</p>

      <h2>Sources</h2>
      <ul>
        <li><a href="https://docs.databricks.com/en/ingestion/file-upload/upload-data.html" target="_blank" rel="noreferrer">Databricks docs: Create or modify a table using file upload</a></li>
        <li><a href="https://community.databricks.com/t5/data-engineering/text-datatype-not-supported-and-data-having-huge-data-in-text/td-p/11883" target="_blank" rel="noreferrer">Databricks Community: a 2.5 million-row CSV that became 85 million rows</a></li>
      </ul>
    </div>
  )
}
