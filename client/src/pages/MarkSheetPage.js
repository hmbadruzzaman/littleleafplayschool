import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { teacherAPI } from '../services/api';
import LeafMark from '../components/common/LeafMark';
import { formatExamDateRange, formatDate, subjectDate, examHasPerSubjectDates } from '../utils/examDates';
import './MarkSheetPage.css';

const EXAM_TYPE_LABEL = {
    MONTHLY:     'Monthly',
    QUARTERLY:   'Quarterly',
    HALF_YEARLY: 'Half Yearly',
    ANNUAL:      'Annual',
};

const todayLabel = () => {
    const d = new Date();
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

const pct = (obtained, max) => {
    const o = Number(obtained) || 0;
    const m = Number(max) || 0;
    if (m <= 0) return 0;
    return Math.round((o / m) * 100);
};

function MarkSheetPage() {
    const { studentId, examIds } = useParams();
    const [bundle, setBundle]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const hasPrinted = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const list = (examIds || '').split(',').filter(Boolean);
                const res = await teacherAPI.getMarkSheet(studentId, list);
                if (!cancelled) {
                    setBundle(res.data.data);
                    setError(null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err?.response?.data?.message || 'Failed to load mark sheet');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [studentId, examIds]);

    // Auto-trigger the print dialog once the sheet has rendered. Guarded so it
    // only fires once even if React re-renders the component.
    useEffect(() => {
        if (bundle && !hasPrinted.current) {
            hasPrinted.current = true;
            const t = setTimeout(() => window.print(), 200);
            return () => clearTimeout(t);
        }
    }, [bundle]);

    if (loading) {
        return <div className="ll-marksheet-status">Preparing mark sheet…</div>;
    }
    if (error) {
        return <div className="ll-marksheet-status ll-marksheet-status--error">{error}</div>;
    }

    const { student, schoolInfo, sheets: rawSheets } = bundle;
    // Cap at 4 — the UI prevents selecting more, but be defensive about
    // hand-crafted URLs. Anything past the cap is dropped silently.
    const sheets = (rawSheets || []).slice(0, 4);
    const schoolName = schoolInfo?.schoolName || 'Little Leaf Play School';

    return (
        <div className="ll-marksheet-page">
            <div className="ll-marksheet">

                {/* Header */}
                <div className="ll-marksheet__header">
                    <div className="ll-marksheet__logo">
                        <LeafMark size={64} />
                    </div>
                    <div className="ll-marksheet__school">
                        <div className="ll-marksheet__school-name">{schoolName}</div>
                        {schoolInfo?.address && (
                            <div className="ll-marksheet__school-line">{schoolInfo.address}</div>
                        )}
                        {(schoolInfo?.phone || schoolInfo?.email) && (
                            <div className="ll-marksheet__school-line">
                                {[schoolInfo.phone, schoolInfo.email].filter(Boolean).join(' · ')}
                            </div>
                        )}
                    </div>
                </div>

                <hr className="ll-marksheet__divider" />
                <div className="ll-marksheet__title">Mark Sheet</div>

                {/* Student info — once, regardless of how many exams follow */}
                <div className="ll-marksheet__info">
                    <Row label="Student"     value={student.fullName} />
                    <Row label="Roll Number" value={student.rollNumber} />
                    <Row label="Class"       value={student.class} />
                </div>

                {/* All exam blocks live in a single-page grid that adapts to
                    the number of sheets (1 / 2 / 3 / 4). */}
                <div className={`ll-marksheet__exams ll-marksheet__exams--${sheets.length}`}>
                    {sheets.map((sheet, i) => (
                        <ExamBlock key={i} exam={sheet.exam} result={sheet.result} />
                    ))}
                </div>

                {/* Footer — once */}
                <div className="ll-marksheet__issued">Issued: {todayLabel()}</div>

                <div className="ll-marksheet__signatures">
                    <div className="ll-marksheet__sig">
                        <div className="ll-marksheet__sig-line" />
                        <div className="ll-marksheet__sig-label">Class Teacher</div>
                    </div>
                    <div className="ll-marksheet__sig">
                        <div className="ll-marksheet__sig-line" />
                        <div className="ll-marksheet__sig-label">Principal</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExamBlock({ exam, result }) {
    const examTypeLabel = EXAM_TYPE_LABEL[exam.examType] || exam.examType;
    const subjects = result?.subjects || [];
    const totalObtained = subjects.reduce((s, x) => s + (Number(x.marksObtained) || 0), 0);
    const totalMax      = subjects.reduce((s, x) => s + (Number(x.maxMarks)      || 0), 0);
    const totalPct      = result?.percentage != null ? Math.round(result.percentage) : pct(totalObtained, totalMax);

    const showDateCol = examHasPerSubjectDates(exam);
    const dateForSubject = (subjName) => {
        const examSubj = (exam.subjects || []).find(s => s.name === subjName);
        return subjectDate(exam, examSubj);
    };
    const colCount = showDateCol ? 5 : 4;

    return (
        <div className="ll-marksheet__exam">
            <div className="ll-marksheet__exam-title">
                <span className="ll-marksheet__exam-name">{exam.examName}</span>
                <span className="ll-marksheet__exam-meta">{examTypeLabel} · {formatExamDateRange(exam)}</span>
            </div>

            <table className="ll-marksheet__table">
                <thead>
                    <tr>
                        <th>Subject</th>
                        {showDateCol && <th>Date</th>}
                        <th className="num">Marks</th>
                        <th className="num">Max</th>
                        <th className="num">%</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.map((s, i) => {
                        const hasComps = Array.isArray(s.components) && s.components.length > 0;
                        return (
                            <React.Fragment key={i}>
                                <tr className={hasComps ? 'll-marksheet__subject-row' : ''}>
                                    <td>{s.name}</td>
                                    {showDateCol && <td>{formatDate(dateForSubject(s.name))}</td>}
                                    <td className="num">{s.marksObtained}</td>
                                    <td className="num">{s.maxMarks}</td>
                                    <td className="num">{pct(s.marksObtained, s.maxMarks)}%</td>
                                </tr>
                                {hasComps && s.components.map((c, ci) => (
                                    <tr key={`${i}-${ci}`} className="ll-marksheet__component-row">
                                        <td>↳ {c.name}</td>
                                        {showDateCol && <td></td>}
                                        <td className="num">{c.marksObtained}</td>
                                        <td className="num">{c.maxMarks}</td>
                                        <td className="num">{pct(c.marksObtained, c.maxMarks)}%</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="ll-marksheet__total-row">
                        <td>Total</td>
                        {showDateCol && <td></td>}
                        <td className="num">{totalObtained}</td>
                        <td className="num">{totalMax}</td>
                        <td className="num">{totalPct}%</td>
                    </tr>
                    {result?.grade && (
                        <tr className="ll-marksheet__grade-row">
                            <td>Grade</td>
                            <td className="num" colSpan={colCount - 1}>{result.grade}</td>
                        </tr>
                    )}
                </tfoot>
            </table>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="ll-marksheet__info-row">
            <div className="ll-marksheet__info-label">{label}</div>
            <div className="ll-marksheet__info-value">{value || '—'}</div>
        </div>
    );
}

export default MarkSheetPage;
