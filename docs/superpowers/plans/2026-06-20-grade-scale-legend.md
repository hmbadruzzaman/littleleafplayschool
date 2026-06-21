# Grade Scale Legend + Admin Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a grade legend (grade → marks range) on the printed marksheet and let the admin edit the global grade scale from the Exam section, with grades computed live from each result's percentage.

**Architecture:** Client-only change. The grade scale is stored as a `gradeScale` array on the existing single SCHOOL_INFO item (`infoId: 'INFO#SCHOOL'`) via the already-existing `adminAPI.updateSchoolInfo`. A new pure util (`grades.js`) converts a percentage + scale into a letter grade and produces legend range strings; every display computes the grade live so editing the scale instantly affects all existing marksheets. No server, route, or controller changes.

**Tech Stack:** React 18 (CRA), plain CSS, axios via `client/src/services/api.js`. Unit tests for the pure util run on CRA's bundled Jest (`react-scripts test`); `@testing-library` is **not** installed, so UI tasks use a production build check + manual visual verification instead of component tests.

---

## Project rule: commits

**Per `CLAUDE.md`, do NOT run `git commit` unless the user explicitly asks.** The commit step at the end of each task is a checkpoint: stage/commit only when the user has authorized it. If unauthorized, skip the commit and continue.

## File Structure

New:
- `client/src/utils/grades.js` — pure grade-scale logic (default scale, normalize, percentage→grade, band→range label).
- `client/src/utils/grades.test.js` — Jest unit tests for the util.
- `client/src/components/modals/GradeScaleModal.js` — self-contained admin editor (loads + saves the scale).

Modified:
- `client/src/pages/MarkSheetPage.js` — live grade row + legend.
- `client/src/pages/MarkSheetPage.css` — legend styles.
- `client/src/pages/admin/ExamsSection.js` — "Grade Scale" button + modal toggle.
- `client/src/components/modals/ViewExamResultsModal.js` — self-fetch scale + live grade.

No server changes. `adminAPI.getSchoolInfo` / `adminAPI.updateSchoolInfo` already exist in `client/src/services/api.js` (lines 119–120).

---

## Task 1: Grade-scale util (`grades.js`) — TDD

**Files:**
- Create: `client/src/utils/grades.js`
- Test: `client/src/utils/grades.test.js`

- [ ] **Step 1: Write the failing test**

Create `client/src/utils/grades.test.js`:

```js
import {
  DEFAULT_GRADE_SCALE,
  normalizeScale,
  gradeForPercentage,
  gradeBandRangeLabel,
} from './grades';

describe('gradeForPercentage', () => {
  test('maps boundary percentages on the default scale', () => {
    expect(gradeForPercentage(100, DEFAULT_GRADE_SCALE)).toBe('A+');
    expect(gradeForPercentage(90, DEFAULT_GRADE_SCALE)).toBe('A+');
    expect(gradeForPercentage(89, DEFAULT_GRADE_SCALE)).toBe('A');
    expect(gradeForPercentage(40, DEFAULT_GRADE_SCALE)).toBe('D');
    expect(gradeForPercentage(39, DEFAULT_GRADE_SCALE)).toBe('F');
    expect(gradeForPercentage(0, DEFAULT_GRADE_SCALE)).toBe('F');
  });

  test('falls back to the default scale when scale is missing/empty', () => {
    expect(gradeForPercentage(95)).toBe('A+');
    expect(gradeForPercentage(55, null)).toBe('C');
    expect(gradeForPercentage(45, [])).toBe('D');
  });

  test('honours a custom scale', () => {
    const custom = [{ label: 'PASS', min: 33 }, { label: 'FAIL', min: 0 }];
    expect(gradeForPercentage(33, custom)).toBe('PASS');
    expect(gradeForPercentage(32, custom)).toBe('FAIL');
  });

  test('sorts an unsorted scale before evaluating', () => {
    const unsorted = [
      { label: 'F', min: 0 },
      { label: 'A', min: 80 },
      { label: 'B', min: 50 },
    ];
    expect(gradeForPercentage(85, unsorted)).toBe('A');
    expect(gradeForPercentage(50, unsorted)).toBe('B');
    expect(gradeForPercentage(10, unsorted)).toBe('F');
  });
});

describe('gradeBandRangeLabel', () => {
  test('builds ranges from the default scale', () => {
    expect(gradeBandRangeLabel(DEFAULT_GRADE_SCALE, 0)).toBe('90–100%');
    expect(gradeBandRangeLabel(DEFAULT_GRADE_SCALE, 1)).toBe('80–89%');
    expect(gradeBandRangeLabel(DEFAULT_GRADE_SCALE, 6)).toBe('0–39%');
  });
});

describe('normalizeScale', () => {
  test('returns the default scale for junk input', () => {
    expect(normalizeScale(null)).toBe(DEFAULT_GRADE_SCALE);
    expect(normalizeScale([])).toBe(DEFAULT_GRADE_SCALE);
    expect(normalizeScale('nope')).toBe(DEFAULT_GRADE_SCALE);
  });

  test('coerces and sorts a valid scale descending by min', () => {
    const out = normalizeScale([
      { label: 'B', min: '50' },
      { label: 'A', min: 80 },
    ]);
    expect(out).toEqual([
      { label: 'A', min: 80 },
      { label: 'B', min: 50 },
    ]);
  });
});
```

Note: the range labels use an en dash (`–`, U+2013), not a hyphen. Copy the character exactly.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd client && CI=true npx react-scripts test --watchAll=false src/utils/grades.test.js`
Expected: FAIL — `Cannot find module './grades'` (file not created yet).

- [ ] **Step 3: Write the implementation**

Create `client/src/utils/grades.js`:

```js
// Global grade scale. Bands are stored high→low by `min`; the letter labels are
// fixed and only each band's `min` percentage is admin-editable. Persisted on
// the SCHOOL_INFO item as `gradeScale`. See
// docs/superpowers/specs/2026-06-20-grade-scale-legend-design.md

export const DEFAULT_GRADE_SCALE = [
  { label: 'A+', min: 90 },
  { label: 'A',  min: 80 },
  { label: 'B+', min: 70 },
  { label: 'B',  min: 60 },
  { label: 'C',  min: 50 },
  { label: 'D',  min: 40 },
  { label: 'F',  min: 0  },
];

// Coerce an arbitrary value into a clean scale sorted high→low by min. Returns
// the shared DEFAULT_GRADE_SCALE (same reference) when given nothing usable.
export function normalizeScale(scale) {
  if (!Array.isArray(scale) || scale.length === 0) return DEFAULT_GRADE_SCALE;
  const cleaned = scale
    .filter((b) => b && typeof b.label === 'string' && Number.isFinite(Number(b.min)))
    .map((b) => ({ label: b.label, min: Number(b.min) }))
    .sort((a, b) => b.min - a.min);
  return cleaned.length ? cleaned : DEFAULT_GRADE_SCALE;
}

// Letter grade for a percentage: the first band (high→low) whose `min` it meets.
export function gradeForPercentage(pct, scale) {
  const bands = normalizeScale(scale);
  const p = Number(pct) || 0;
  const band = bands.find((b) => p >= b.min);
  return band ? band.label : bands[bands.length - 1].label;
}

// Human range for the band at `index` in a high→low scale, e.g. "90–100%",
// "80–89%", "0–39%".
export function gradeBandRangeLabel(scale, index) {
  const bands = normalizeScale(scale);
  const band = bands[index];
  if (!band) return '';
  const upper = index === 0 ? 100 : bands[index - 1].min - 1;
  return `${band.min}–${upper}%`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd client && CI=true npx react-scripts test --watchAll=false src/utils/grades.test.js`
Expected: PASS — all suites green.

- [ ] **Step 5: Commit** (only if the user has authorized commits — see "Project rule: commits")

```bash
git add client/src/utils/grades.js client/src/utils/grades.test.js
git commit -m "feat(client): add grade-scale util with live percentage→grade mapping"
```

---

## Task 2: Marksheet — live grade row + legend

**Files:**
- Modify: `client/src/pages/MarkSheetPage.js`
- Modify: `client/src/pages/MarkSheetPage.css`

- [ ] **Step 1: Import the util**

In `client/src/pages/MarkSheetPage.js`, add to the imports (after the `examDates` import on line 5):

```js
import { normalizeScale, gradeForPercentage, gradeBandRangeLabel } from '../utils/grades';
```

- [ ] **Step 2: Resolve the scale and pass it to each exam block**

In `MarkSheetPage`, just after the `schoolName` line (currently line 76), add:

```js
    const gradeScale = normalizeScale(schoolInfo?.gradeScale);
```

Then change the `ExamBlock` render line (currently line 114) to pass the scale:

```js
                        <ExamBlock key={i} exam={sheet.exam} result={sheet.result} scale={gradeScale} />
```

- [ ] **Step 3: Add the legend between the exams grid and the footer**

Immediately after the closing `</div>` of `ll-marksheet__exams` (currently line 116) and before the `ll-marksheet__issued` div (currently line 119), insert:

```jsx
                {/* Grade legend — rendered once for the whole sheet */}
                <div className="ll-marksheet__legend">
                    <span className="ll-marksheet__legend-title">Grading</span>
                    {gradeScale.map((band, i) => (
                        <span key={band.label} className="ll-marksheet__legend-item">
                            <strong>{band.label}</strong> {gradeBandRangeLabel(gradeScale, i)}
                        </span>
                    ))}
                </div>
```

- [ ] **Step 4: Compute the grade row live in `ExamBlock`**

Change the `ExamBlock` function signature (currently line 136) from `function ExamBlock({ exam, result }) {` to:

```js
function ExamBlock({ exam, result, scale }) {
```

Replace the existing grade `<tr>` block (currently lines 200–205):

```jsx
                    {result?.grade && (
                        <tr className="ll-marksheet__grade-row">
                            <td>Grade</td>
                            <td className="num" colSpan={colCount - 1}>{result.grade}</td>
                        </tr>
                    )}
```

with the live computation:

```jsx
                    <tr className="ll-marksheet__grade-row">
                        <td>Grade</td>
                        <td className="num" colSpan={colCount - 1}>{gradeForPercentage(totalPct, scale)}</td>
                    </tr>
```

(`totalPct` is already computed at the top of `ExamBlock`. The grade now always shows — `gradeForPercentage` returns the floor band, e.g. `F`, at worst.)

- [ ] **Step 5: Add legend styles**

In `client/src/pages/MarkSheetPage.css`, just before the `/* Footer ──… */` comment (currently line 280), add:

```css
/* Grade legend ───────────────────────────────────────── */

.ll-marksheet__legend {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px 16px;
    margin: 16px 0 28px;
    padding-top: 12px;
    border-top: 1px dashed #d8d2c0;
    font-size: 11px;
    color: #4a4a40;
}

.ll-marksheet__legend-title {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6a6a60;
}

.ll-marksheet__legend-item strong {
    color: #2a3a25;
    margin-right: 2px;
}
```

- [ ] **Step 6: Verify the build compiles**

Run: `cd client && CI=true npm run build`
Expected: `Compiled successfully` (warnings allowed; no errors). This confirms the new imports/JSX are valid.

- [ ] **Step 7: Manual visual verification**

Start the stack (server: `cd server && npm run local`; client: `cd client && npm start`). Log in as admin (`ADM001 / password123` in local mode), go to **Students → a student → View Exam Results**, select an exam with marks, and click **Print** (opens `/marksheet/...`). Confirm:
- Each exam block's **Grade** row shows a letter matching the percentage.
- A single **Grading** legend appears below the exam tables and above the signatures, listing `A+ 90–100%`, `A 80–89%`, … `F 0–39%`.

- [ ] **Step 8: Commit** (only if authorized — see "Project rule: commits")

```bash
git add client/src/pages/MarkSheetPage.js client/src/pages/MarkSheetPage.css
git commit -m "feat(marksheet): compute grade live and show grading legend"
```

---

## Task 3: Grade-scale editor modal (`GradeScaleModal.js`)

**Files:**
- Create: `client/src/components/modals/GradeScaleModal.js`

- [ ] **Step 1: Create the modal component**

Create `client/src/components/modals/GradeScaleModal.js`:

```jsx
import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { DEFAULT_GRADE_SCALE, normalizeScale } from '../../utils/grades';

// Admin editor for the global grade scale. Self-contained: loads the current
// scale from SCHOOL_INFO on open and saves it back. Labels are fixed; only each
// band's minimum % is editable, and the lowest band is pinned at 0%.
function GradeScaleModal({ onClose, onSaved }) {
    const [bands, setBands]     = useState(DEFAULT_GRADE_SCALE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving]   = useState(false);
    const [error, setError]     = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await adminAPI.getSchoolInfo();
                const scale = normalizeScale(res?.data?.data?.gradeScale);
                if (!cancelled) setBands(scale);
            } catch (e) {
                if (!cancelled) setBands(DEFAULT_GRADE_SCALE);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const setMin = (index, raw) => {
        const value = raw === '' ? '' : parseInt(raw, 10);
        setBands((prev) => prev.map((b, i) => (i === index ? { ...b, min: value } : b)));
    };

    // Returns an error message string, or '' when the scale is valid.
    const validate = () => {
        for (let i = 0; i < bands.length; i++) {
            const min = Number(bands[i].min);
            if (bands[i].min === '' || !Number.isInteger(min) || min < 0 || min > 100) {
                return `${bands[i].label}: minimum must be a whole number from 0 to 100.`;
            }
            if (i > 0 && min >= Number(bands[i - 1].min)) {
                return `${bands[i].label} (${min}%) must be lower than ${bands[i - 1].label} (${bands[i - 1].min}%).`;
            }
        }
        if (Number(bands[bands.length - 1].min) !== 0) {
            return `The lowest grade (${bands[bands.length - 1].label}) must start at 0%.`;
        }
        return '';
    };

    const handleSave = async () => {
        const msg = validate();
        if (msg) { setError(msg); return; }
        setSaving(true);
        setError('');
        try {
            const gradeScale = bands.map((b) => ({ label: b.label, min: Number(b.min) }));
            await adminAPI.updateSchoolInfo({ gradeScale });
            if (onSaved) onSaved(gradeScale);
            onClose();
        } catch (e) {
            setError(e?.response?.data?.message || 'Failed to save grade scale.');
            setSaving(false);
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(20,28,18,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, padding: 16,
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: 'var(--surface)', borderRadius: 'var(--radius)',
                    width: 420, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                }}
            >
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>
                        Grade Scale
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        Set the minimum percentage for each grade. The marksheet legend uses these ranges.
                    </p>
                </div>

                <div style={{ padding: '16px 24px' }}>
                    {loading ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
                    ) : (
                        <>
                            {bands.map((band, i) => {
                                const isFloor = i === bands.length - 1;
                                return (
                                    <div key={band.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                                        <span style={{ width: 40, fontWeight: 700, color: 'var(--forest-900)' }}>{band.label}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>min %</span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={band.min}
                                            disabled={isFloor}
                                            onChange={(e) => setMin(i, e.target.value)}
                                            style={{
                                                width: 80, padding: '6px 8px', fontSize: 14,
                                                border: '1px solid var(--border-soft)', borderRadius: 8,
                                                background: isFloor ? 'var(--cream-50)' : 'var(--surface)',
                                                color: 'var(--text)',
                                            }}
                                        />
                                        {isFloor && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(floor, fixed)</span>
                                        )}
                                    </div>
                                );
                            })}
                            {error && (
                                <div style={{ marginTop: 8, color: '#b85b4a', fontSize: 12 }}>{error}</div>
                            )}
                        </>
                    )}
                </div>

                <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={onClose} className="btn btn-ghost" style={{ fontSize: 13 }} disabled={saving}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className="btn btn-primary" style={{ fontSize: 13 }} disabled={loading || saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default GradeScaleModal;
```

- [ ] **Step 2: Verify the build compiles**

Run: `cd client && CI=true npm run build`
Expected: `Compiled successfully`. (The component is not yet rendered anywhere; this step only checks it parses/compiles. It is wired up in Task 4.)

- [ ] **Step 3: Commit** (only if authorized — see "Project rule: commits")

```bash
git add client/src/components/modals/GradeScaleModal.js
git commit -m "feat(admin): add grade-scale editor modal"
```

---

## Task 4: Wire the "Grade Scale" button into the Exam section

**Files:**
- Modify: `client/src/pages/admin/ExamsSection.js`

- [ ] **Step 1: Import the modal**

In `client/src/pages/admin/ExamsSection.js`, add after the `AddExamForm` import (line 3):

```js
import GradeScaleModal from '../../components/modals/GradeScaleModal';
```

- [ ] **Step 2: Add toggle state**

After the `editing` state declaration (currently line 20: `const [editing, setEditing] = useState(null); // exam being edited`), add:

```js
    const [showGradeScale, setShowGradeScale] = useState(false);
```

- [ ] **Step 3: Add the button to the header**

Replace the header row that holds the "Add Exam" button (currently lines 73–81):

```jsx
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>
                            Exams
                        </h2>
                        <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
                            + Add Exam
                        </button>
                    </div>
```

with a version that adds a "Grade Scale" button next to it:

```jsx
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>
                            Exams
                        </h2>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => setShowGradeScale(true)} className="btn btn-ghost" style={{ fontSize: 13 }}>
                                Grade Scale
                            </button>
                            <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
                                + Add Exam
                            </button>
                        </div>
                    </div>
```

- [ ] **Step 4: Render the modal**

After the `editing` modal block (currently lines 166–172, ending `)}` before the final `</div>`), add:

```jsx
            {showGradeScale && (
                <GradeScaleModal onClose={() => setShowGradeScale(false)} />
            )}
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd client && CI=true npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 6: Manual verification**

With the stack running, log in as admin → **Exams**. Confirm a **Grade Scale** button sits left of **+ Add Exam**. Click it: the editor opens showing 7 rows (A+ … F), F's input disabled at 0. Change a threshold to something invalid (e.g. set `A` min above `A+`) and Save → an inline error blocks it. Set valid descending values and Save → modal closes without error. Re-open it → the saved values persist (confirms the round-trip to SCHOOL_INFO).

- [ ] **Step 7: Commit** (only if authorized — see "Project rule: commits")

```bash
git add client/src/pages/admin/ExamsSection.js
git commit -m "feat(admin): open grade-scale editor from the Exam section"
```

---

## Task 5: Live grade in the admin results modal

**Files:**
- Modify: `client/src/components/modals/ViewExamResultsModal.js`

- [ ] **Step 1: Import the util**

In `client/src/components/modals/ViewExamResultsModal.js`, add after the `examDates` import (line 4):

```js
import { DEFAULT_GRADE_SCALE, normalizeScale, gradeForPercentage } from '../../utils/grades';
```

- [ ] **Step 2: Add scale state**

After the `selectedExamIds` state (currently line 13), add:

```js
    const [gradeScale, setGradeScale] = useState(DEFAULT_GRADE_SCALE);
```

- [ ] **Step 3: Fetch the scale inside `fetchData`**

In `fetchData`, after the marks are set (just after the block that calls `setMarks(marksData.data || [])`, currently around line 63), add a best-effort scale load using the already-imported `adminAPI`:

```js
            try {
                const infoRes = await adminAPI.getSchoolInfo();
                setGradeScale(normalizeScale(infoRes?.data?.data?.gradeScale));
            } catch (e) {
                // Keep the default scale if school info can't be loaded.
            }
```

- [ ] **Step 4: Compute the grade row live**

Replace the grade cell (currently line 236):

```jsx
                                                                                <span className="status-badge active">{examMarks.grade}</span>
```

with a live computation from the same totals the modal already sums:

```jsx
                                                                                {(() => {
                                                                                    const obtained = examMarks.subjects.reduce((sum, s) => sum + (parseInt(s.marksObtained) || 0), 0);
                                                                                    const max = examMarks.subjects.reduce((sum, s) => sum + (parseInt(s.maxMarks) || 0), 0);
                                                                                    const pct = max > 0 ? Math.round((obtained / max) * 100) : 0;
                                                                                    return <span className="status-badge active">{gradeForPercentage(pct, gradeScale)}</span>;
                                                                                })()}
```

- [ ] **Step 5: Verify the build compiles**

Run: `cd client && CI=true npm run build`
Expected: `Compiled successfully`.

- [ ] **Step 6: Manual verification**

With the stack running and a non-default scale saved (from Task 4), open **Students → a student → View Exam Results** for an exam with marks. Confirm the **Grade** row reflects the *current* scale (i.e. matches what the marksheet would print), not a stale stored value. Edit the scale, reopen the modal, and confirm the displayed grade updates accordingly.

- [ ] **Step 7: Commit** (only if authorized — see "Project rule: commits")

```bash
git add client/src/components/modals/ViewExamResultsModal.js
git commit -m "feat(admin): compute results-modal grade live from the saved scale"
```

---

## Final verification

- [ ] Run the util tests once more: `cd client && CI=true npx react-scripts test --watchAll=false src/utils/grades.test.js` → PASS.
- [ ] Production build clean: `cd client && CI=true npm run build` → `Compiled successfully`.
- [ ] End-to-end manual pass: edit the scale in the Exam section → open the results modal → print a marksheet, and confirm the grade letters and legend ranges are consistent across all three and reflect the edited scale.
