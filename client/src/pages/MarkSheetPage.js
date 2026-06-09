import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { teacherAPI } from '../services/api';
import LeafMark from '../components/common/LeafMark';
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
    const { studentId, examId } = useParams();
    const [bundle, setBundle]   = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);
    const hasPrinted = useRef(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await teacherAPI.getMarkSheet(studentId, examId);
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
    }, [studentId, examId]);

    // Auto-trigger the print dialog once the sheet has rendered. Guarded so it
    // only fires once even if React re-renders the component.
    useEffect(() => {
        if (bundle && !hasPrinted.current) {
            hasPrinted.current = true;
            // Small delay so the browser has a chance to paint before opening the dialog.
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

    const { student, exam, result, schoolInfo } = bundle;
    const schoolName = schoolInfo?.schoolName || 'Little Leaf Play School';
    const examTypeLabel = EXAM_TYPE_LABEL[exam.examType] || exam.examType;
    const subjects = result?.subjects || [];
    const totalObtained = subjects.reduce((s, x) => s + (Number(x.marksObtained) || 0), 0);
    const totalMax      = subjects.reduce((s, x) => s + (Number(x.maxMarks)      || 0), 0);
    const totalPct      = result?.percentage != null ? Math.round(result.percentage) : pct(totalObtained, totalMax);

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

                {/* Student / exam block */}
                <div className="ll-marksheet__info">
                    <Row label="Student"     value={student.fullName} />
                    <Row label="Roll Number" value={student.rollNumber} />
                    <Row label="Class"       value={student.class} />
                    <Row label="Exam"        value={`${exam.examName} (${examTypeLabel})`} />
                    <Row label="Exam Date"   value={exam.examDate} />
                </div>

                {/* Subject table */}
                <table className="ll-marksheet__table">
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th className="num">Marks</th>
                            <th className="num">Max</th>
                            <th className="num">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subjects.map((s, i) => (
                            <tr key={i}>
                                <td>{s.name}</td>
                                <td className="num">{s.marksObtained}</td>
                                <td className="num">{s.maxMarks}</td>
                                <td className="num">{pct(s.marksObtained, s.maxMarks)}%</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="ll-marksheet__total-row">
                            <td>Total</td>
                            <td className="num">{totalObtained}</td>
                            <td className="num">{totalMax}</td>
                            <td className="num">{totalPct}%</td>
                        </tr>
                        {result?.grade && (
                            <tr className="ll-marksheet__grade-row">
                                <td>Grade</td>
                                <td className="num" colSpan={3}>{result.grade}</td>
                            </tr>
                        )}
                    </tfoot>
                </table>

                {/* Footer */}
                <div className="ll-marksheet__issued">Issued: {todayLabel()}</div>

                <div className="ll-marksheet__signatures">
                    <div className="ll-marksheet__sig">
                        <div className="ll-marksheet__sig-line" />
                        <div className="ll-marksheet__sig-label">Class Teacher</div>
                    </div>
                    <div className="ll-marksheet__sig">
                        <div className="ll-marksheet__sig-line" />
                        <div className="ll-marksheet__sig-label">{schoolInfo?.principalName ? 'Principal' : 'Principal'}</div>
                    </div>
                </div>
            </div>
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
