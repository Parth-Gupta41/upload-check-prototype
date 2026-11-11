# Does your table match your file? (concept prototype)

A clickable prototype for a product requirements document. It shows a proposed check on the "Create or modify table from files" upload screen that catches tables that don't match the file they came from, before anyone builds on them.

**This is a concept prototype, not a Databricks product.** It uses no Databricks branding. Everything runs in the browser; files you drop in are never uploaded.

## What it shows

- **Today vs Proposed.** A toggle in the banner flips the same file between today's behavior and the proposed one.
- **Today:** line breaks inside cells split records into extra rows, blank and repeated column names are dropped, a comma in a column name blocks Create with a generic message, and nothing says the table differs from the file.
- **Proposed:** a whole-file check before Create that says "Your file has 2,000 rows. This table would have 4,850.", shows one real split record, offers a one-click fix that is guarded and rechecked, handles column names inline, asks once before creating a mismatched table, and leaves a receipt on the table page.
- **Event log:** the events the design would send, mapped to its metrics.
- **About:** problem, persona, jobs to be done, story map, evidence, metrics, non-goals and limits.

## How the numbers are produced

Two readers process every file (`src/engine/csv.ts`):

- **Reader A (default):** every non-blank line is a row; quotes can't span lines. This reproduces the upload screen with "Rows span multiple lines" off. On the public Yelp sample (`yelp.csv` from the GitHub repo justmarkham/DAT8) it gives 29,307 rows, 24,485 of which don't fit the header, and an average rating of 3.30. A Databricks trial workspace produced the same numbers.
- **Reader B (setting on):** standard CSV with line breaks kept inside quotes. On the same file it gives 10,000 rows and an average rating of 3.78.

The fix is offered only when it reduces rows that don't fit and keeps at least half of the rows that already fit (`fixIsSafe` in `src/engine/analyze.ts`). A stray quote that would swallow the file fails this test, so the fix is never offered there.

## Run it

Requires Node 20 or later.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 25 tests
npm run build      # production build in dist/
```

To run the Yelp acceptance test, download `yelp.csv` from the public GitHub repo justmarkham/DAT8 (data folder) into `tests/fixtures/`. It is ignored by git; don't commit it.

## Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes on every push to `main`. In the repository, go to Settings > Pages and set Source to "GitHub Actions" once.

## Limits

- The demo files are synthetic and generated in the browser.
- The default reader emulates the upload screen's behavior for CSV; it is not Databricks code.
- Speed in a browser is not a measure of speed on the real platform.
- The personas are composites; the warning wording still needs testing with real analysts.
- Out of scope: other file formats, other ingestion paths, delimiter and encoding fixes.

## Project structure

```
src/engine/      readers, detection, guard, column checks, table building, web worker
src/scenarios/   deterministic demo files
src/state/       app state and event log
src/pages/       Guide, Upload, Table, About
src/components/  app shell and event log drawer
src/copy.ts      user-facing copy for the check
tests/           unit tests, scenario ground truth, copy rules, real-file acceptance
DESIGN.md        journey, screens and visual tokens
```
