import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import AddExamForm from '../../components/forms/AddExamForm';

const CLASS_FILTERS = ['ALL', 'Play', 'Nursery', 'LKG', 'UKG'];

const TYPE_LABEL = {
    MONTHLY:     'Monthly',
    QUARTERLY:   'Quarterly',
    HALF_YEARLY: 'Half Yearly',
    ANNUAL:      'Annual',
};

function ExamsSection() {
    const [exams, setExams]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [filterClass, setFilterClass]   = useState('ALL');
    const [showAdd, setShowAdd]           = useState(false);
    const [editing, setEditing]           = useState(null); // exam being edited

    useEffect(() => { fetchExams(); }, []);

    const fetchExams = async () => {
        setLoading(true);
        try {
            const res = await adminAPI.getAllExams();
            // Sort newest first by examDate (string compare on YYYY-MM-DD works)
            const sorted = (res.data.data || []).slice().sort((a, b) =>
                (b.examDate || '').localeCompare(a.examDate || '')
            );
            setExams(sorted);
            setError(null);
        } catch (err) {
            console.error('Error fetching exams:', err);
            setError('Failed to load exams. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (exam) => {
        if (exam.hasResults) return; // button should already be disabled
        if (!window.confirm(`Delete "${exam.examName}" (${exam.class})? This cannot be undone.`)) return;
        try {
            await adminAPI.deleteExam(exam.examId);
            await fetchExams();
        } catch (err) {
            console.error('Delete exam error:', err);
            alert(err?.response?.data?.message || 'Failed to delete exam');
        }
    };

    const displayed = filterClass === 'ALL'
        ? exams
        : exams.filter(e => e.class === filterClass);

    if (loading) return <div className="loading">Loading exams…</div>;
    if (error)   return <div className="error">{error}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Section card */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>
                            Exams
                        </h2>
                        <button onClick={() => setShowAdd(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
                            + Add Exam
                        </button>
                    </div>
                    {/* Class filter pills */}
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {CLASS_FILTERS.map(c => (
                            <button key={c} onClick={() => setFilterClass(c)} style={{
                                padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                                border: '1px solid ' + (filterClass === c ? 'var(--forest-300)' : 'var(--border-soft)'),
                                background: filterClass === c ? 'var(--forest-100)' : 'transparent',
                                color: filterClass === c ? 'var(--forest-800)' : 'var(--text-muted)',
                                cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em', textTransform: 'uppercase',
                                transition: 'all 0.15s',
                            }}>
                                {c === 'ALL' ? 'All' : c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* List */}
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                    {displayed.length === 0 ? (
                        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                            No exams here.
                        </div>
                    ) : displayed.map((exam) => {
                        const subjectsSummary = (exam.subjects || [])
                            .map(s => `${s.name} ${s.maxMarks}`)
                            .join(' · ');
                        return (
                            <div key={exam.examId}
                                style={{
                                    padding: '16px 24px',
                                    borderBottom: '1px solid var(--border-soft)',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 4 }}>
                                        <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--forest-900)' }}>{exam.examName}</span>
                                        <span style={{
                                            background: 'var(--forest-50)', color: 'var(--forest-800)',
                                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                                            letterSpacing: '0.05em', textTransform: 'uppercase',
                                        }}>
                                            {TYPE_LABEL[exam.examType] || exam.examType}
                                        </span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {exam.class} · {exam.examDate}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-light)', lineHeight: 1.5 }}>
                                        {subjectsSummary || <em style={{ color: 'var(--text-muted)' }}>No subjects configured</em>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                    <button onClick={() => setEditing(exam)} className="btn btn-ghost" style={{ fontSize: 12 }}>
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(exam)}
                                        disabled={exam.hasResults}
                                        title={exam.hasResults ? 'Cannot delete: marks have been recorded' : ''}
                                        className="btn btn-ghost"
                                        style={{
                                            fontSize: 12,
                                            color: exam.hasResults ? 'var(--text-muted)' : '#b85b4a',
                                            cursor: exam.hasResults ? 'not-allowed' : 'pointer',
                                            opacity: exam.hasResults ? 0.5 : 1,
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {showAdd && (
                <AddExamForm
                    onClose={() => setShowAdd(false)}
                    onSuccess={fetchExams}
                />
            )}

            {editing && (
                <AddExamForm
                    exam={editing}
                    onClose={() => setEditing(null)}
                    onSuccess={fetchExams}
                />
            )}
        </div>
    );
}

export default ExamsSection;
