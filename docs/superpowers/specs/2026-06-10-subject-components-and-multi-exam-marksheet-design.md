# Subject Components & Multi-Exam Mark Sheet

**Date:** 2026-06-10
**Status:** Approved design; ready for implementation

## Problem

Two related gaps in the exam system:

1. Today an exam subject has a single max-marks number. Real-world school assessments often split a subject into named components (e.g. English = Written + Viva), and admin/teachers can't capture that.
2. The mark sheet prints one student × one exam. End-of-term reports usually combine several exams into one document (Half Yearly + Annual, or Monthly + Quarterly + Half Yearly + Annual). The exam metadata also belongs *with the table* of a given exam, not in the student-info header — once we have multiple exams in one sheet, a single header can no longer represent them.

## Goals

- Each subject of an exam can optionally have a list of named components, each with its own max marks. Components are decided per-subject (English may split, Drawing may not, in the same exam).
- Marks entry captures per-component scores when components exist; subject totals are derived.
- The mark sheet supports one *or more* exams for the same student in a single document, with the exam header attached to each exam's table. The student info block, school header, and signatures appear once per sheet.
- Admin and teacher pick which exams to include from the student's exam-results view.

## Non-goals

- Allowing components to vary per student for the same exam. Every student taking an exam sees the same component shape.
- Editing components on an exam that already has marks recorded (covered by the existing subject lock — `exam.hasResults` continues to lock subjects AND their components).
- Reordering exams within a mark sheet beyond the order in which the user checks them. Whatever order the URL lists is the order the sheet uses.
- Bulk multi-student combined sheets (one PDF with several students). The mark sheet still represents one student.

## Data model (backwards-compatible)

### `LittleLeaf_Exams` — `subjects` item

```js
{
    name: 'English',
    maxMarks: 50,                          // sum of components when present
    components: [                          // optional
        { name: 'Written', maxMarks: 40 },
        { name: 'Viva',    maxMarks: 10 }
    ]
}
```

Rules:
- `components` is optional. When absent, the subject behaves exactly like today.
- When `components` is present and non-empty, the subject's `maxMarks` MUST equal the sum of `components[].maxMarks`. The UI computes and locks `maxMarks` in this case; the server recomputes/overwrites it on save as a safety net.
- A subject with `components: []` is treated as "no components" (same as omitting the field).
- Existing exam rows in DynamoDB don't have `components` — they are unaffected. The new code path treats missing/empty `components` as a single-row subject.

### `LittleLeaf_ExamResults` — `subjects` item

```js
{
    name: 'English',
    marksObtained: 47,                     // sum of components when present
    maxMarks: 50,                          // sum of components when present
    components: [                          // optional, mirrors exam shape
        { name: 'Written', marksObtained: 38, maxMarks: 40 },
        { name: 'Viva',    marksObtained:  9, maxMarks: 10 }
    ]
}
```

- When the exam's matching subject has components, the result also stores components. The server recomputes the subject's `marksObtained` and `maxMarks` as the sum of components on save.
- For subjects without components, the result row is shaped exactly like today.

## API contract changes

### `POST /api/teacher/marks` (unchanged URL; widened validation)

Same request body shape, with optional `components` per subject. Server behavior:

1. Validate each subject:
   - If `subject.components` is a non-empty array: validate each `0 ≤ component.marksObtained ≤ component.maxMarks`. Recompute `subject.marksObtained` and `subject.maxMarks` from the components (do not trust client-supplied totals — recompute and overwrite).
   - Otherwise: validate `0 ≤ subject.marksObtained ≤ subject.maxMarks` (today's behavior).
2. Upsert behavior unchanged (existing `getByStudentAndExam` lookup, update if present, create if not).

### `GET /api/teacher/marksheet/:studentId/:examIds` (route param renamed)

`examIds` is one or more URL-encoded exam IDs joined by commas, e.g.:
- Single: `EXAM%23abc123`
- Multiple: `EXAM%23abc123,EXAM%23def456`

Behavior:
1. Split `examIds` on `,`. The list MUST be non-empty (empty → 400).
2. Fetch student. 404 if missing.
3. Fetch school info (404 is non-fatal — falls back to `{}`).
4. For each `examId` in list order: fetch exam, fetch `ExamResultModel.getByStudentAndExam(studentId, examId)`. If either is missing for ANY id, return 404 with a message naming which one was missing.
5. Return:

```json
{
    "success": true,
    "data": {
        "student": { ... },
        "schoolInfo": { ... },
        "sheets": [
            { "exam": { ... }, "result": { ... } },
            { "exam": { ... }, "result": { ... } }
        ]
    },
    "message": "Mark sheet bundle retrieved"
}
```

Sheet order matches `examIds` order. The single-exam case is just `sheets.length === 1`.

## UI changes

### `client/src/components/forms/AddExamForm.js`

For each subject in the dynamic "Subjects" list:

- Existing **Name** and **Max Marks** inputs remain.
- A small **"+ Add components"** link/button under the row reveals an inline editor:
  - A vertical list of rows: `Component name | Max marks | ✕`.
  - An "Add component" button that appends a blank row.
  - When ≥1 component exists, the subject's **Max Marks** input becomes read-only and displays the live sum of component max marks.
  - A **"Remove all components"** link to collapse back to single-mark mode.
- A subject may have zero or N components — admin's choice per subject.
- The existing subject lock (`exam.hasResults`) extends to component-level inputs in edit mode: when locked, components are read-only with the same yellow note already shown.

The on-submit payload uses the new `subjects[].components` shape when present.

### `client/src/components/forms/UploadMarksForm.js`

When the selected exam (or the prop-passed exam in edit mode) is loaded:

- For each subject:
  - If `subject.components` is non-empty: render one indented row per component with a name + read-only max + editable obtained input. A non-editable **Subject Total** row sits underneath, showing the live sum / sum of max.
  - Otherwise: render today's single row (`subject name | max | obtained`).
- Validation:
  - Per-component: `0 ≤ obtained ≤ component.maxMarks`.
  - For subjects without components: today's validation.
- On submit:
  - Per subject with components: pass `components: [{ name, marksObtained, maxMarks }]` plus the subject `name` and the computed `marksObtained`/`maxMarks` (server will recompute as the safety net).
  - Per subject without components: today's shape.

The grand-total bar at the bottom of the form sums across all subjects.

### `client/src/components/modals/ViewExamResultsModal.js` (admin) and `client/src/components/modals/TeacherStudentDetailsModal.js` (teacher)

Two changes, both applied to both modals (they have parallel structure):

**(a) Render components in the per-exam marks table.** Where today the marks table lists one row per subject, when a subject has `components`, render one indented row per component below the subject's own row, followed by an explicit "Total" row that matches today's totals row.

**(b) Multi-exam selection.**
- A small checkbox appears on each exam card that has `examMarks`.
- The existing per-card **"Print Mark Sheet"** button is **removed** (it lives only in the header now).
- A new **"Print Mark Sheet"** button appears in the section header (next to the `<h3>Exam Results</h3>`), disabled until ≥1 box is checked. Its label dynamically reads `Print Mark Sheet (N)` showing the count.
- Clicking it does:
  ```js
  const ids = selectedIds.map(encodeURIComponent).join(',');
  window.open(`/marksheet/${encodeURIComponent(student.studentId)}/${ids}`, '_blank');
  ```
- Selection state is local to the modal (resets when the modal closes).

The existing "Delete Marks" / "Edit Marks" / "Upload Marks" per-card buttons are unchanged.

### `client/src/pages/MarkSheetPage.js`

Page layout becomes:

```
[School header]                             ← once
[Student info block — name/roll/class]      ← once
─────────────────────────────────────────
[Exam #1 title strip]   ← per-sheet
[Subject table for Exam #1, with grouped component rows]
─────────────────────────────────────────
[Exam #2 title strip]
[Subject table for Exam #2 …]
─────────────────────────────────────────
[Issued date]                               ← once
[Class Teacher / Principal signatures]      ← once
```

- "Exam title strip" renders `examName · examType label · examDate` inline on top of the table.
- Each subject table renders subjects; when a subject has components, one indented sub-row per component appears below the subject's name row, with the subject's own row showing the per-subject total. Today's "Subject / Marks / Max / %" columns stay.
- "Grade" row stays at the bottom of each per-exam table.
- The data source is now `bundle.sheets` (an array). Single-exam still works (`sheets.length === 1`).

### `client/src/pages/MarkSheetPage.css`

- New class `.ll-marksheet__exam` wraps each exam block.
- `@media print { .ll-marksheet__exam + .ll-marksheet__exam { page-break-before: always; } }` — exams 2..N each start on a fresh page in print. Exam 1 stays on the same page as the school + student headers.
- New rules for component rows: indented left padding, slightly muted text, italic subject heading row above the components, and a bolder "Total" row underneath each subject group.

### `client/src/services/api.js`

```js
getMarkSheet: (studentId, examIds) => {
    const idList = Array.isArray(examIds) ? examIds : [examIds];
    const joined = idList.map(encodeURIComponent).join(',');
    return api.get(`/teacher/marksheet/${encodeURIComponent(studentId)}/${joined}`);
}
```

## Data flow

```
Admin/Teacher opens student details
        │
        ▼
Checks one or more exam cards   (state lives in modal)
        │
        ▼
Clicks header "Print Mark Sheet (N)"
        │
        ▼
window.open('/marksheet/:studentId/:examIds', '_blank')
        │
        ▼
ProtectedRoute → MarkSheetPage
        │
        ▼
useEffect → GET /api/teacher/marksheet/:studentId/:examIds
        │
        ▼
Server splits examIds, fetches { student, schoolInfo, sheets[] }
        │
        ▼
Page renders all sheets, then window.print() fires once
```

## Edge cases

- **Single exam selected:** mark sheet has one exam block. Visually similar to today, except the exam header strip now lives at the top of the table (not inside the student info box).
- **Many exams selected (≥3):** each exam after the first starts on a new printed page. On-screen they stack with a thin divider.
- **Stale checkbox state:** if an admin checks a card and then someone else deletes the marks for that exam (between check and click), the bundle endpoint 404s and the new tab shows the existing "No marks found" message. The checked-out modal is unaffected.
- **One subject has components and another doesn't, on the same exam:** both render correctly. The component-aware subject renders its sub-rows; the simple subject renders a single row, exactly as today.
- **Component max-marks edit on an exam with results:** blocked by the same lock. Server's `updateExam` strips `subjects` (and thereby `components`) when `hasResults` is true.
- **Client sends inconsistent totals (e.g. components sum to 47, client says 45):** server recomputes from components and overwrites. No request rejection.
- **Backwards compat — old exams/results without `components`:** every consumer (UploadMarksForm, ViewExamResultsModal, MarkSheetPage, StudentDashboard) treats missing/empty `components` as "single-row subject", which is exactly how things work today.

## Testing approach

Manual smoke tests, run in this order:

1. **Create an exam with mixed subjects.** As admin → Exams → Add Exam. Add subject "English" with components Written 40 + Viva 10. Add subject "Drawing" with single max-marks 50. Save. Confirm subject row shows components summary inline (e.g. "English 50 · Drawing 50").
2. **Enter marks.** Open a student in that exam's class → Upload Marks → exam picker → confirm English shows two indented inputs (Written, Viva) and Drawing shows one. Enter values and save. Confirm the saved result reads back with component breakdown.
3. **View / edit marks.** Reopen ViewExamResultsModal for the same student. The exam card now shows component rows beneath English. Click Edit Marks — form pre-fills component values. Change one and save. Re-open — value persisted.
4. **Subject lock with components.** From Exams list, edit the exam — both the subject editor and the component editor should be disabled with the existing yellow notice.
5. **Single-exam mark sheet.** Check one exam card → header "Print Mark Sheet (1)" enabled → click → new tab → sheet shows one exam block with the exam title strip atop the table, component sub-rows under English, and a single Drawing row. Save as PDF, confirm page break behavior (no break before or after).
6. **Multi-exam mark sheet.** Add a second exam, enter marks. Check both → "Print Mark Sheet (2)" → new tab → school header + student info appear once; two exam blocks follow; each table has its own header. Save as PDF, confirm exam #2 starts on a new page.
7. **Teacher path.** Log in as a teacher with permissions → TeacherStudentDetailsModal → confirm checkboxes + header button behave identically.
8. **Backwards compat.** Create an exam without using any components. Confirm the marks-entry, view, and mark sheet paths all behave like before.

No automated tests; consistent with the rest of the codebase.

## Out of scope (deferred)

- Bulk multi-student sheets ("one PDF with mark sheets for the whole class").
- Component-level grading (e.g. component grades). The grade we display stays at the subject / exam level.
- Per-component weighting other than max-marks-based summation.
- Reordering exams or letting users drag the order in the mark sheet.

## Files touched (summary)

**Server**
- `server/controllers/teacherController.js` — widen `uploadMarks` validation; rewrite `getMarkSheetBundle` for the list-of-examIds case.
- `server/routes/teacher.js` — rename route param `:examId` → `:examIds`.

**Client**
- `client/src/services/api.js` — generalize `getMarkSheet`.
- `client/src/components/forms/AddExamForm.js` — components sub-editor per subject.
- `client/src/components/forms/UploadMarksForm.js` — indented component rows; per-component validation.
- `client/src/components/modals/ViewExamResultsModal.js` — checkbox per exam card; header Print button; component breakdown in marks table.
- `client/src/components/modals/TeacherStudentDetailsModal.js` — same changes for the teacher view.
- `client/src/pages/MarkSheetPage.js` — render `sheets[]`; exam title strip on each table; components-aware rows.
- `client/src/pages/MarkSheetPage.css` — `.ll-marksheet__exam` wrapper + per-exam page break + component row styling.

**No changes**
- `server/models/Exam.js`, `server/models/ExamResult.js` (`{ name, maxMarks, ...flexible }` already, no schema lock).
- DynamoDB schema.
- Student dashboard chips (we keep showing per-subject totals; components are visible on the mark sheet).
