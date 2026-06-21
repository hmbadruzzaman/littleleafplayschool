# Grade Scale Legend + Admin Editor — Design

**Date:** 2026-06-20
**Status:** Approved

## Problem

The printed marksheet shows a letter grade per exam but no legend explaining
what marks range each grade represents. The grade thresholds are hardcoded in
`server/utils/helpers.js` (`calculateGrade`) and cannot be changed by the admin.

We want to:

1. Show a grade legend (grade → marks range) on the marksheet.
2. Let the admin edit the grade scale from the admin portal's Exam section.

## Decisions

- **Scope:** one global grade scale (not per-exam, not per-class).
- **Grade computation:** computed *live* from each result's percentage + the
  current scale wherever it is displayed. Editing the scale instantly affects
  all existing marksheets — no migration/backfill.
- **Editor flexibility:** edit thresholds only. The 7 grade labels stay fixed
  (`A+, A, B+, B, C, D, F`); the admin edits only the minimum percentage per band.
- **Placement:** marksheet legend near the footer/signatures (rendered once);
  admin editor opened from a "Grade Scale" button at the top of the Exam section.

## Data Model

Store the scale as a `gradeScale` key on the existing single SCHOOL_INFO item
(`infoId: 'INFO#SCHOOL'`). No new table. `adminController.updateSchoolInfo`
already accepts arbitrary keys, so **no server changes are required**.

```js
gradeScale: [
  { label: 'A+', min: 90 },
  { label: 'A',  min: 80 },
  { label: 'B+', min: 70 },
  { label: 'B',  min: 60 },
  { label: 'C',  min: 50 },
  { label: 'D',  min: 40 },
  { label: 'F',  min: 0  },   // floor band, min fixed at 0
]
```

- Bands are sorted descending by `min`.
- A band's displayed range is `min … (next-higher band's min − 1)`. The top band
  ends at 100; the floor band starts at 0. Examples: "A+: 90–100%",
  "A: 80–89%", "F: 0–39%".

## Components

### `client/src/utils/grades.js` (new)

- `DEFAULT_GRADE_SCALE` — constant matching the current hardcoded thresholds
  (the array above). Used as fallback whenever `schoolInfo.gradeScale` is absent.
- `gradeForPercentage(pct, scale)` — returns the label of the first band (scale
  sorted descending) where `pct >= min`. This is the single live-grade function;
  it replaces reliance on the stored `result.grade`.
- `gradeBandRangeLabel(band, scale)` — returns the range string for the legend
  (e.g. `"90–100%"`, `"80–89%"`, `"0–39%"`).

The stored `result.grade` written at upload time becomes vestigial but harmless;
it is left untouched (server upload-time `calculateGrade` unchanged) to avoid churn.
Displays no longer read it.

### `client/src/pages/MarkSheetPage.js` (+ `MarkSheetPage.css`)

- Resolve `scale = schoolInfo.gradeScale || DEFAULT_GRADE_SCALE` (the bundle
  already carries `schoolInfo`). Pass `scale` into each `ExamBlock`.
- In `ExamBlock`, compute the Grade row via `gradeForPercentage(totalPct, scale)`
  instead of `result.grade`. Keep the row's existing condition/styling.
- Add a compact **legend** rendered once, near the footer/signatures, listing
  each band as `label: range`. New CSS class(es) in `MarkSheetPage.css`, styled
  to print cleanly on one page.

### `client/src/components/modals/GradeScaleModal.js` (new, + colocated CSS)

- Opens from the Exam section. Loads the current scale (passed in from
  `ExamsSection`) or `DEFAULT_GRADE_SCALE`.
- Renders 7 fixed-label rows; each row edits only the `min %`. The `F` row's
  min is fixed at 0 and disabled.
- **Validation** before save: every `min` is an integer 0–100, and mins are
  strictly descending top-to-bottom (no gaps that break ordering, no overlaps).
  Show an inline error and block save otherwise.
- Saves via `adminAPI.updateSchoolInfo({ gradeScale })`. On success, closes and
  reports the updated scale back to `ExamsSection`.

### `client/src/pages/admin/ExamsSection.js`

- Add a **"Grade Scale"** button at the top, next to "Add Exam".
- Render `GradeScaleModal` when the button is clicked. `ExamsSection` holds no
  grade-scale state itself — the modal loads and saves the scale on its own.

### `client/src/components/modals/ViewExamResultsModal.js`

- `ViewExamResultsModal` is rendered inside `StudentDetailsModal`, not
  `ExamsSection`, so threading a prop from `ExamsSection` is not viable. Instead
  the modal **self-fetches** the scale (`adminAPI.getSchoolInfo`) in its existing
  `fetchData`, defaulting to `DEFAULT_GRADE_SCALE` on error.
- Compute its Grade row via `gradeForPercentage(pct, scale)` instead of
  `examMarks.grade`, where `pct` is derived from the totals the modal already sums.

## API

No new endpoints. Reuse existing:

- `adminAPI.getSchoolInfo()` → `GET /admin/school-info` (already present in
  `client/src/services/api.js`).
- `adminAPI.updateSchoolInfo(updates)` → `PUT /admin/school-info` (already present).

## Out of Scope (YAGNI)

- Per-exam or per-class grade scales.
- Adding/removing/renaming grade bands.
- Migrating or recomputing stored `result.grade` values.
- Server-side changes to `calculateGrade`.

## Files Touched

New:
- `client/src/utils/grades.js`
- `client/src/components/modals/GradeScaleModal.js` (+ CSS)

Modified:
- `client/src/pages/MarkSheetPage.js` (+ `MarkSheetPage.css`)
- `client/src/pages/admin/ExamsSection.js`
- `client/src/components/modals/ViewExamResultsModal.js`

Server: none.
