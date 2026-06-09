# Mark Sheet Printing

**Date:** 2026-06-09
**Status:** Approved design; ready for implementation

## Problem

Admin and teacher can already enter and view a student's marks per exam, but there is no way to produce a printable mark sheet for sharing with parents or filing. They need a single-click path from a student's exam-results view to a clean, formatted document they can either send to a printer or save as a PDF.

## Goals

- Both admin and teacher can print a per-student, per-exam mark sheet.
- The mark sheet looks like a real school document (school header, student info, subject table, totals/grade, signature lines) — not the in-app UI cropped down.
- Producing a PDF is supported via the browser's "Save as PDF" in the print dialog. No PDF library, no server-side PDF rendering.
- Triggered from the exam-result card the user is already looking at — no separate "reports" section.

## Non-goals

- Bulk mark sheets (one exam, every student in the class at once).
- Per-school logo upload. The existing `LeafMark` SVG is the brand mark used throughout the app and serves the same role here.
- Custom templates per exam type. One template handles Monthly/Quarterly/Half Yearly/Annual; the exam name and type already differentiate them in the header.
- Email or delivery integration.

## API contract

### `GET /api/teacher/marksheet/:studentId/:examId` (new)

Auth: `verifyToken, isAdminOrTeacher` (same middleware that already gates the marks routes — admin can call too).

Behavior:
1. Fetch the student by `studentId`. 404 if missing.
2. Fetch the exam by `examId`. 404 if missing.
3. Fetch the exam result for this (student, exam) via `ExamResultModel.getByStudentAndExam`. **If no result exists, 404** with `{ success: false, message: "No marks found for this student and exam" }`.
4. Fetch the school info row (the `INFO#SCHOOL` item). If missing, return an empty object `{}` rather than erroring.
5. Return `{ success: true, data: { student, exam, result, schoolInfo } }`.

This is the only new endpoint. Everything else the page needs is in this single bundle.

## UI changes

### New page: `client/src/pages/MarkSheetPage.js`

A full-page React component, not nested in admin or teacher dashboards. Behaviors:

- Reads `:studentId` and `:examId` from URL params.
- On mount: calls the new endpoint, stores `{ student, exam, result, schoolInfo }` in state.
- While loading: renders **"Preparing mark sheet…"** centered on the page.
- On error / 404: renders **"No marks found for this student / exam"** (or the server's message) with no `window.print()` call.
- On success: renders the mark sheet layout below, then triggers `window.print()` from a `useEffect` that fires once the bundle is non-null.
- The user closes the tab after printing; there's no in-page navigation chrome.

### Mark sheet layout (single A4 portrait)

Top section (header):
- `LeafMark` SVG at ~64px on the left.
- Right of the logo: school name in display-serif (large), then address, then `phone · email` in muted text.
- A horizontal divider, then the title **"MARK SHEET"** centered.

Student/exam block (boxed):
- Two-column label/value list: Student Name, Roll Number, Class, Exam (name + type label), Date.

Subject table:
- Columns: **Subject · Marks · Max · %**.
- One row per subject from `result.subjects`.
- Footer rows: **Total**, then **Grade** (uses `result.grade`).
- Percentage per row computed client-side: `(marksObtained / maxMarks) * 100` rounded to nearest integer. Total % uses `result.percentage` from the server.

Footer:
- "Issued: <today's date>" on the left.
- Two signature lines side by side near the bottom: **Class Teacher** and **Principal**. Lines are empty — printed and signed by hand.

### Print-tuned CSS: `client/src/pages/MarkSheetPage.css`

- `@page { size: A4; margin: 12mm; }` for predictable margins.
- `@media print`:
  - `body { background: white; }` to defeat any inherited app background.
  - `.ll-marksheet { box-shadow: none; }`.
  - `table { page-break-inside: avoid; }` so the marks table doesn't split.
- On-screen styles use a centered card that mimics the printed A4 page (max width ~800px, white background, subtle border) so the user sees what will print.

### Modified: `client/src/App.js`

Add a new route inside `AppRoutes`:

```jsx
<Route
    path="/marksheet/:studentId/:examId"
    element={
        <ProtectedRoute allowedRoles={['ADMIN', 'TEACHER']}>
            <MarkSheetPage />
        </ProtectedRoute>
    }
/>
```

`MarkSheetPage` imported at the top alongside the other dashboard pages.

### Modified: `client/src/services/api.js`

Add to `teacherAPI`:

```js
getMarkSheet: (studentId, examId) =>
    api.get(`/teacher/marksheet/${encodeURIComponent(studentId)}/${encodeURIComponent(examId)}`)
```

Both admin and teacher UIs call this helper.

### Modified: `client/src/components/modals/ViewExamResultsModal.js`

In the per-exam card action row (currently has Upload/Edit/Delete Marks buttons), add a **"Print Mark Sheet"** button, shown only when `examMarks` exists. On click:

```js
window.open(`/marksheet/${encodeURIComponent(student.studentId)}/${encodeURIComponent(exam.examId)}`, '_blank');
```

### Modified: `client/src/components/modals/TeacherStudentDetailsModal.js`

Same button added at the same spot in the same card structure. Same `window.open` call.

## Data flow

```
Admin/Teacher clicks "Print Mark Sheet"
        │
        ▼
window.open('/marksheet/:studentId/:examId', '_blank')
        │
        ▼
New tab: ProtectedRoute checks JWT (shared via localStorage) ──► /login if invalid
        │
        ▼
MarkSheetPage.useEffect → GET /api/teacher/marksheet/:studentId/:examId
        │
        ▼
Server bundles { student, exam, result, schoolInfo } ──► 404 if missing student / exam / result
        │
        ▼
Page renders mark sheet ──► useEffect on bundle fires window.print()
        │
        ▼
OS print dialog: Print, or Save as PDF
```

## Edge cases

- **Empty subjects array on result**: the table still renders its header and totals row. Total is `0/0` and percentage falls back to `0%`. This shouldn't happen in practice (`uploadMarks` validates), but no crash.
- **Missing school info**: header uses fallback `"Little Leaf Play School"` and omits address/phone/email lines.
- **Stale tab refresh**: refreshing the new tab re-fetches the bundle. Marks edits made elsewhere appear without a workaround.
- **Auth missing**: ProtectedRoute redirects to `/login`. User logs in there, then re-opens the mark sheet URL (`window.location.href` is preserved by the redirect-after-login flow if it exists; otherwise the user re-clicks Print).
- **Pop-up blocked**: a small risk on Safari with `window.open`. Since the open is triggered by a direct user click (not async), browsers generally allow it. If it ever breaks, the fix is to render an `<a target="_blank">` instead, but not needed by default.
- **`window.print()` called twice on re-render**: guarded by storing a `hasPrinted` ref so the call only fires once per page load.

## Testing approach

Manual, in order:

1. As admin, open a student with marks recorded for at least one exam. The exam card with marks should show a new "Print Mark Sheet" button.
2. Click it. A new tab opens, fetches the bundle, renders the sheet, and the print dialog appears.
3. Choose "Save as PDF" — verify the PDF has the school header, student info, subject table, total/grade, signature lines, and looks A4-shaped (no clipping).
4. Close the new tab, repeat from a different student or different exam to confirm URL routing works.
5. As teacher (TCH001 or similar), open a student with marks via the teacher portal. Same button should appear. Click → same flow.
6. Try a student with **no** marks for an exam: the button should not appear on that exam card. If you manually craft the URL `/marksheet/:studentId/:examId` with no marks recorded, the page should show the "No marks found" message and NOT call `window.print()`.
7. Test browser print preview at the typical A4 size on screen. Confirm the marks table does not split across pages.

No automated tests; the project has none today and adding a print-testing harness is out of scope.

## Out of scope (deferred)

- Class-wide bulk print ("one mark sheet per student in this class") — would need a second page that fetches all students for a class and iterates page breaks. Add later if it becomes a real need.
- Custom signatures or stamps embedded in the PDF.
- Customizable templates (per-class or per-board) — single template only.
- Localization of the mark sheet copy.

## Files touched (summary)

- **New**: `server/controllers/teacherController.js` change (add `getMarkSheetBundle`), `server/routes/teacher.js` change (add the route), `client/src/pages/MarkSheetPage.js`, `client/src/pages/MarkSheetPage.css`.
- **Modified**: `client/src/App.js`, `client/src/services/api.js`, `client/src/components/modals/ViewExamResultsModal.js`, `client/src/components/modals/TeacherStudentDetailsModal.js`.
- **No changes**: `server/models/*`, DynamoDB schema, the marks upload/edit flow.
