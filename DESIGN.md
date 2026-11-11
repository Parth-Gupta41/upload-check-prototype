# Design breakdown

Written before building. The source of truth for how the prototype looks and behaves.

## User journey (Maya)

1. **Gets the file.** Her manager forwards an export and wants an answer by Friday.
2. **Brings it in.** Data ingestion > Create or modify table from files > drops the file.
3. **Checks it.** Today: looks at a 50-row preview and an enabled button. Proposed: also reads one line or one panel that says whether the table matches the file.
4. **Fixes it.** Proposed only: one click for split rows, inline actions for columns, a header row picker.
5. **Creates the table.** Proposed: asked once if a confirmed problem is still open.
6. **Uses it.** Table page shows rows, columns, sample data, a receipt, and a demo quick check (average of the rating column) that makes the consequence visible.

## Screens

| Screen | Route | Purpose |
|---|---|---|
| Guide | `#/` | What this is, three-minute demo script, scenario cards |
| Upload, empty | `#/upload` | Drop zone, demo files |
| Upload, preview | `#/upload` | Options, check area (Proposed), 50-row grid, Create |
| Table | `#/table/:name` | Catalog-style table page with receipt and quick check |
| About | `#/about` | PRD context: problem, persona, jobs, story map, evidence, metrics, limits |

Overlays: Advanced attributes dialog, create confirm modal, rows drawer, event log drawer.

## Visual tokens

Captured from a Databricks trial workspace in dark theme (computed styles, November 2026). Light theme values are the matching design-system light tokens, not captured.

| Token | Dark (captured) | Light |
|---|---|---|
| Shell (top bar, sidebar) | #1F272D | #F6F7F9 |
| Main panel | #11171C | #FFFFFF |
| Text primary | #E8ECF0 | #11171C |
| Text secondary | #92A4B3 | #5F7281 |
| Label | rgba(255,255,255,0.85), 600 | #11171C, 600 |
| Border (controls) | #37444F | #D1D9E1 |
| Border (decorative, grid lines) | #1F272D | #E8ECF0 |
| Link and primary action | #4299E0 (button text #11171C) | #2272B4 (button text #FFFFFF) |
| Active nav and selected chip tint | rgba(138,202,255,0.08 / 0.16) | rgba(34,114,180,0.08 / 0.16) |
| "New" button tint | rgba(255,73,73,0.08) | rgba(255,54,33,0.06) |
| Null pill | bg #37444F, text #E65B77 | bg #E8ECF0, text #C82D4C |
| Warning | #DE7921 | #BE501E |
| Success | #3BA65E | #277C43 |
| Info | #4299E0 | #2272B4 |

Type: system font stack (`-apple-system, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans`), 13px/18px base, page title 22px/28px 600, labels 13px 600, file size 12px.

Shapes: controls 32px tall, 4px radius, 1px border; chips 999px radius; drop zone 2px dashed decorative border, 10px radius; main panel 8px radius inset in the shell; grid header 42px on shell color; grid rows 35px with a 1px decorative bottom border; 8px cell padding.

## Check area styles

- Confirmed ("won't match"): warning-tinted background (8%), 1px warning border at 50%, 4px radius, warning icon.
- Possible ("may not match"): info-tinted background, info icon.
- Success line: no box, success check icon, primary text.
- Never red. Icon plus text for every status.

## Branding

No Databricks logo, wordmark or name in the app chrome. Product name "Data workspace (concept)" with a generic icon. Persistent banner: "Concept prototype for a PRD. Not a Databricks product."
