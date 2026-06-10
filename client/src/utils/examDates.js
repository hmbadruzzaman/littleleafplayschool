// Shared helpers for exam/subject date handling.
//
// New exams carry per-subject dates (`subject.examDate`); old exams in DynamoDB
// have only `exam.examDate` at the top level. Every read site falls back from
// subject → exam so old data keeps rendering.

export function subjectDate(exam, subject) {
    return subject?.examDate || exam?.examDate || null;
}

// All distinct subject dates for an exam, sorted ascending. Falls back to the
// exam-level date when no subject dates exist.
export function subjectDates(exam) {
    const subjects = exam?.subjects || [];
    const raw = subjects.map(s => subjectDate(exam, s)).filter(Boolean);
    if (raw.length === 0 && exam?.examDate) return [exam.examDate];
    return Array.from(new Set(raw)).sort();
}

// The "exam date" for sorting and list display. Earliest subject date,
// falling back to the legacy top-level field, then null.
export function examEarliestDate(exam) {
    const dates = subjectDates(exam);
    return dates[0] || null;
}

// "15 May 2026" for one-off display.
export function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Compact label for an exam: a single date when all subject dates match
// ("15 May 2026") or a range when they don't ("15 May 2026 – 22 May 2026").
export function formatExamDateRange(exam) {
    const dates = subjectDates(exam);
    if (dates.length === 0) return '';
    if (dates.length === 1) return formatDate(dates[0]);
    return `${formatDate(dates[0])} – ${formatDate(dates[dates.length - 1])}`;
}

// True iff any subject of this exam has more than one distinct date — used
// by display code to decide whether to render a "Date" column at all.
export function examHasPerSubjectDates(exam) {
    return subjectDates(exam).length > 1;
}
