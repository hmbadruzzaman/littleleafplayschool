# Admin Exam Management

**Date:** 2026-06-08
**Status:** Approved design; ready for implementation

## Problem

The codebase already contains `AddExamForm`, `UploadMarksForm`, and `ViewExamResultsModal`, but admin has no reachable path to create or edit exams (`AddExamForm` is orphaned), the marks form can't edit existing marks, and there is no `PUT`/`DELETE` route for exams. As a result, admin can neither set up an exam nor correct a wrong entry.

## Goals

- Admin can create, list, edit, and delete exams from a dedicated UI.
- Admin can enter marks for any student and edit them later.
- Exam subject lists and per-subject max marks are protected from being changed underneath already-recorded marks.

## Non-goals

- No bulk-delete of marks. If admin needs to delete an exam that already has marks, they will need a separate "clear results" affordance not covered by this design.
- No multi-class exams. One exam remains tied to one class.
- No teacher-side changes. The teacher portal continues to call the same `/api/teacher/marks` endpoint; admin uses it too (existing `isAdminOrTeacher` middleware).
- No new model fields beyond what the existing `ExamModel`/`ExamResultModel` already support.

## Data model

No schema change. Reuses:

- `LittleLeaf_Exams`: `{ examId, examName, class, examType, examDate, subjects: [{ name, maxMarks }], totalMarks, ... }`.
- `LittleLeaf_ExamResults`: `{ resultId, examId, studentId, subjects: [{ name, marksObtained, maxMarks }], marksObtained, totalMarks, percentage, grade, ... }`.

A derived field is introduced on the API response only (not stored):

- `exam.hasResults: boolean` — `true` iff at least one row in `LittleLeaf_ExamResults` references that `examId`.

## API contract

### `GET /api/admin/exams` (modified)

Same response shape as today, with one added field per exam: `hasResults`.

Implementation: after the existing scan of `LittleLeaf_Exams`, perform one additional scan of `LittleLeaf_ExamResults` with `ProjectionExpression: 'examId'`, build a `Set<examId>` in memory, and attach `hasResults` to each returned exam. One extra scan total — not N+1.

### `PUT /api/admin/exams/:examId` (new)

Request body: any subset of `{ examName, class, examType, examDate, subjects, totalMarks }`.

Behavior:
1. Look up existing exam by `examId`; 404 if missing.
2. Check `ExamResultModel.getByExamId(examId)`. If the array is non-empty, **strip `subjects` and `totalMarks` from the update payload** before calling `ExamModel.update()` — the lock is enforced server-side, not just in the UI.
3. Return the updated exam (with `hasResults` recomputed for parity with the list endpoint).

Response: `{ success: true, data: <updated exam> }`.

### `DELETE /api/admin/exams/:examId` (new)

Behavior:
1. Check `ExamResultModel.getByExamId(examId)`. If non-empty, return **409** with `{ success: false, message: "Cannot delete: <N> student(s) have marks recorded for this exam." }`.
2. Otherwise call `ExamModel.delete(examId)` and return `{ success: true, message: "Exam deleted." }`.

### `POST /api/teacher/marks` (modified — upsert)

Same request body as today: `{ studentId, examId, subjects: [...] }`.

Behavior change in `teacherController.uploadMarks`:
1. Call `ExamResultModel.getByStudentAndExam(studentId, examId)`.
2. If a result exists, call `ExamResultModel.update(existing.resultId, { subjects, marksObtained, totalMarks })`. This also recomputes `percentage` and `grade` (the `update()` method already does this when `marksObtained` and `totalMarks` are present).
3. If no result exists, fall through to today's `create()` path.

Both branches respond with `{ success: true, data: <result> }`. The client doesn't need to know which path was taken.

## UI changes

### New: `client/src/pages/admin/ExamsSection.js`

Layout follows the existing admin-section pattern (see `StudentsSection`, `TeachersSection` for reference):

- Section header: title "Exams" + "+ Add Exam" button on the right.
- Filter pills row: All / Play / Nursery / LKG / UKG, same styling as `InquiriesSection` status filters.
- Card list (one row per exam), matching the row pattern used in `InquiriesSection`'s left pane (padded row, bottom-border separator, hover background). One row shows: Name · Type (Half Yearly / Annual / Quarterly / Monthly) · Class · Date · Subjects (compact line, e.g. "English 50 · Maths 50 · Hindi 50") · Edit · Delete.
  - Edit button opens `AddExamForm` in edit mode.
  - Delete button: opens a confirm dialog. Disabled with tooltip "Cannot delete: marks have been recorded" when `hasResults` is true.

Data flow:
- On mount and after every mutation, fetch `GET /api/admin/exams` and store the list.
- After create/edit/delete, refetch (don't optimistically mutate — `hasResults` depends on the server-side scan).

### Modified: `AddExamForm.js`

- New optional prop `exam` (the exam being edited). When present:
  - Pre-populate all form fields from `exam`.
  - Change modal title to "Edit Exam" and submit button to "Save Changes".
  - Submit via `PUT /api/admin/exams/<examId>` instead of `POST /api/admin/exams`.
  - When `exam.hasResults === true`, render the subjects sub-form (name/maxMarks inputs, add/remove subject buttons) in a disabled state, with an inline note: "Subjects and max marks are locked because marks have been recorded for this exam."

The "create" code path (no `exam` prop) is unchanged.

### Modified: `client/src/pages/AdminDashboard.js`

- Add `{ key: 'exams', icon: 'notebook', label: 'Exams' }` to `NAV_ITEMS`, slotted between `teachers` and `fees`.
- Add corresponding `PAGE_META.exams` entry with title "Exams" and a one-line subtitle in the same voice as the existing entries.
- Add `{activeSection === 'exams' && <ExamsSection />}` to the content switch.
- Add a `notebook` entry to the `NavIcon` paths map — a simple stroke-based notebook outline (rect with two horizontal lines), matching the line weight and stroke style of the other inline icons in that file.

### Modified: `ViewExamResultsModal.js`

- Remove the single "Upload Marks" button in the section header (lines ~82–90 today).
- For each exam card, render either:
  - **"Upload Marks"** button (when no result exists for this exam+student), or
  - **"Edit Marks"** button (when a result exists).
- Both buttons open the same `UploadMarksForm`, but `Edit Marks` passes an additional `existingResult` prop.

### Modified: `UploadMarksForm.js`

- Accept new optional prop `existingResult`.
- When provided:
  - Skip the exam-picker UI; the exam is fixed by `existingResult.examId`. Display the exam name in the header instead.
  - Pre-fill `marksData` from `existingResult.subjects`.
  - Change title/submit text to "Edit Marks" / "Save Changes".
- Submit logic unchanged — it already calls `POST /api/teacher/marks`, which is now upsert.

## Edge cases

- **Editing exam name/date/type when marks exist:** Allowed. Lock applies only to `subjects` and `totalMarks`. Students who already have results see whatever subject list was captured at the time their marks were saved.
- **Lowering a subject's max marks after marks recorded:** Cannot happen — caught by the subject lock.
- **Deleting an exam with results:** Blocked at the route with a 409 and an explanatory message. Admin must clear marks first (out of scope; needs a separate feature if it becomes a real need).
- **Stale `hasResults` flag:** The Exams section refetches the list after every create/edit/delete and after closing the marks modal. The `ViewExamResultsModal` already refetches `marks` after upload (see `fetchData()` call in its `onSuccess` handler) — that keeps the Upload/Edit button state correct.
- **Concurrent edit (two admins):** Out of scope. Last write wins; no version stamp.
- **Renaming a subject between two recordings of the same exam:** Cannot happen due to the lock; the only way subjects can ever differ from the original is if all results were cleared first.

## Testing approach

Manual smoke tests after implementation, in this order:

1. As admin, create an exam (LKG, Half Yearly, 3 subjects). Confirm it appears in the Exams list. Confirm Delete works (no marks yet).
2. Recreate the exam, open a student in LKG, click "Upload Marks", submit. Confirm the per-exam button on `ViewExamResultsModal` flips from "Upload Marks" → "Edit Marks".
3. From the Exams list, edit the exam: change name and date (should save); attempt to add a subject (input should be disabled, with the lock note shown).
4. From the Exams list, attempt to delete the exam — Delete button should be disabled with the tooltip.
5. Open the same student, click "Edit Marks", change a number, save. Verify the displayed grade/total updates and there is still exactly **one** result row (no duplicates) by re-fetching `/api/teacher/marks/<studentId>`.
6. Create a second exam (no marks) and delete it via the Exams list — should succeed.

No automated tests; the project has none today and adding a test harness is out of scope for this change.

## Out of scope (deferred)

- Bulk marks entry (one exam, table of all students in the class). Today's per-student flow is what the user asked for.
- Re-using a previous exam's subject list when creating a new exam ("clone subjects from…"). Nice-to-have if exam creation becomes frequent.
- Soft delete / archive of exams.
- Teacher portal updates — none planned.

## Files touched (summary)

- New: `client/src/pages/admin/ExamsSection.js`.
- Modified: `client/src/pages/AdminDashboard.js`, `client/src/components/forms/AddExamForm.js`, `client/src/components/modals/ViewExamResultsModal.js`, `client/src/components/forms/UploadMarksForm.js`.
- Modified: `server/routes/admin.js`, `server/controllers/adminController.js`, `server/controllers/teacherController.js`.
- No changes: `server/models/Exam.js`, `server/models/ExamResult.js`, DynamoDB schema.
