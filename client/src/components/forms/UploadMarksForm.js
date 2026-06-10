import React, { useState } from 'react';
import { subjectDate, formatDate, examEarliestDate } from '../../utils/examDates';
import './Forms.css';

// Build a marksData entry for a subject.
// - When the subject has components, store `components: [{name, maxMarks, marksObtained}]` and no top-level marksObtained.
// - Otherwise, store today's flat shape (`marksObtained`, `maxMarks`).
// existingComponentMarks/existingFlatMarks: prior result values for pre-fill (edit mode).
function buildMarksRow(exam, subject, existingSubject) {
    const effectiveDate = subjectDate(exam, subject);
    const hasComponents = Array.isArray(subject.components) && subject.components.length > 0;
    if (hasComponents) {
        return {
            name: subject.name,
            examDate: effectiveDate,
            maxMarks: subject.maxMarks,
            components: subject.components.map(c => {
                const existingC = existingSubject?.components?.find(ec => ec.name === c.name);
                return {
                    name: c.name,
                    maxMarks: c.maxMarks,
                    marksObtained: existingC?.marksObtained != null ? existingC.marksObtained.toString() : '',
                };
            }),
        };
    }
    return {
        name: subject.name,
        examDate: effectiveDate,
        maxMarks: subject.maxMarks,
        marksObtained: existingSubject?.marksObtained != null ? existingSubject.marksObtained.toString() : '',
    };
}

function UploadMarksForm({ student, exams, onClose, onSuccess, existingResult = null }) {
    const isEdit = !!existingResult;

    // In edit mode, the exam is fixed; pre-fill marksData from the existing result
    // by matching against the exam's subject definition (source of truth for shape).
    const initialExamId = existingResult?.examId ?? '';
    const initialExam = existingResult && exams.find(ex => ex.examId === existingResult.examId);
    const initialMarks = initialExam?.subjects
        ? initialExam.subjects.map(subject => buildMarksRow(
              initialExam,
              subject,
              existingResult.subjects?.find(s => s.name === subject.name)
          ))
        : [];

    const [selectedExamId, setSelectedExamId] = useState(initialExamId);
    const [marksData, setMarksData] = useState(initialMarks);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleExamChange = (e) => {
        const examId = e.target.value;
        setSelectedExamId(examId);

        const exam = exams.find(ex => ex.examId === examId);
        if (exam && exam.subjects && exam.subjects.length > 0) {
            setMarksData(exam.subjects.map(s => buildMarksRow(exam, s, null)));
            setError('');
        } else {
            setMarksData([]);
            if (exam && (!exam.subjects || exam.subjects.length === 0)) {
                setError('This exam has no subjects configured. Please contact admin to add subjects to this exam.');
            }
        }
    };

    const handleMarksChange = (index, value) => {
        const updatedMarks = [...marksData];
        updatedMarks[index] = { ...updatedMarks[index], marksObtained: value };
        setMarksData(updatedMarks);
    };

    const handleComponentChange = (index, ci, value) => {
        const updatedMarks = [...marksData];
        const subj = updatedMarks[index];
        updatedMarks[index] = {
            ...subj,
            components: subj.components.map((c, j) => (j === ci ? { ...c, marksObtained: value } : c)),
        };
        setMarksData(updatedMarks);
    };

    // Per-subject derived obtained total (for display in component-subject rows).
    const subjectObtainedTotal = (subj) => {
        if (Array.isArray(subj.components)) {
            return subj.components.reduce((s, c) => s + (parseFloat(c.marksObtained) || 0), 0);
        }
        return parseFloat(subj.marksObtained) || 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Per-subject validation. Each cell must be filled, non-negative, ≤ its max.
        for (const m of marksData) {
            if (Array.isArray(m.components)) {
                for (const c of m.components) {
                    if (c.marksObtained === '' || c.marksObtained == null) {
                        setError(`Please enter marks for ${m.name} · ${c.name}.`);
                        return;
                    }
                    const obtained = parseFloat(c.marksObtained);
                    const max      = parseFloat(c.maxMarks);
                    if (isNaN(obtained) || obtained < 0 || obtained > max) {
                        setError(`Marks for ${m.name} · ${c.name} must be between 0 and ${max}.`);
                        return;
                    }
                }
            } else {
                if (m.marksObtained === '' || m.marksObtained == null) {
                    setError(`Please enter marks for ${m.name}.`);
                    return;
                }
                const obtained = parseFloat(m.marksObtained);
                const max      = parseFloat(m.maxMarks);
                if (isNaN(obtained) || obtained < 0 || obtained > max) {
                    setError(`Marks for ${m.name} must be between 0 and ${max}.`);
                    return;
                }
            }
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';
            const response = await fetch(`${API_URL}/teacher/marks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    studentId: student.studentId,
                    examId: selectedExamId,
                    subjects: marksData
                })
            });

            const data = await response.json();

            if (data.success) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                setError(data.message || 'Failed to upload marks');
            }
        } catch (err) {
            setError('An error occurred while uploading marks');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const selectedExam = exams.find(ex => ex.examId === selectedExamId);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>{isEdit ? 'Edit Marks' : 'Upload Marks'}</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                            {student.fullName} ({student.rollNumber})
                            {isEdit && selectedExam ? ` · ${selectedExam.examName}` : ''}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-body">
                        {error && <div className="error-message">{error}</div>}

                        {!isEdit && (
                            <div className="form-group">
                                <label>Select Exam *</label>
                                <select
                                    value={selectedExamId}
                                    onChange={handleExamChange}
                                    required
                                >
                                    <option value="">-- Choose an exam --</option>
                                    {exams.map((exam, index) => (
                                        <option key={index} value={exam.examId}>
                                            {exam.examName} - {exam.examType} ({formatDate(examEarliestDate(exam))})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selectedExam && marksData.length > 0 && (
                            <div className="form-group">
                                <label>Enter Marks for Each Subject</label>
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    marginTop: '8px'
                                }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ backgroundColor: '#f9fafb' }}>
                                            <tr>
                                                <th style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'left',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    borderBottom: '1px solid #e5e7eb'
                                                }}>
                                                    Subject
                                                </th>
                                                <th style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'center',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    borderBottom: '1px solid #e5e7eb',
                                                    width: '150px'
                                                }}>
                                                    Max Marks
                                                </th>
                                                <th style={{
                                                    padding: '12px 16px',
                                                    textAlign: 'center',
                                                    fontSize: '0.9rem',
                                                    fontWeight: '600',
                                                    color: '#374151',
                                                    borderBottom: '1px solid #e5e7eb',
                                                    width: '200px'
                                                }}>
                                                    Marks Obtained *
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {marksData.map((subject, index) => {
                                                const hasComponents = Array.isArray(subject.components);
                                                if (!hasComponents) {
                                                    return (
                                                        <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                            <td style={{ padding: '12px 16px', fontSize: '0.95rem' }}>
                                                                {subject.name}
                                                                {subject.examDate && (
                                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                                                                        {formatDate(subject.examDate)}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.95rem', color: '#6b7280' }}>
                                                                {subject.maxMarks}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                                <input
                                                                    type="number"
                                                                    value={subject.marksObtained}
                                                                    onChange={(e) => handleMarksChange(index, e.target.value)}
                                                                    min="0"
                                                                    max={subject.maxMarks}
                                                                    step="0.5"
                                                                    placeholder="0"
                                                                    required
                                                                    style={{
                                                                        width: '100%',
                                                                        maxWidth: '120px',
                                                                        padding: '8px 12px',
                                                                        border: '1px solid #d1d5db',
                                                                        borderRadius: '6px',
                                                                        fontSize: '0.9rem',
                                                                        textAlign: 'center'
                                                                    }}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                // Component-bearing subject: render a subject row with the running
                                                // total, then one indented row per component with its own input.
                                                const obtainedSum = subjectObtainedTotal(subject);
                                                return (
                                                    <React.Fragment key={index}>
                                                        <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                                            <td style={{ padding: '12px 16px', fontSize: '0.95rem', fontWeight: 600 }}>
                                                                {subject.name}
                                                                {subject.examDate && (
                                                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px', fontWeight: 400 }}>
                                                                        {formatDate(subject.examDate)}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.95rem', color: '#6b7280' }}>
                                                                {subject.maxMarks}
                                                            </td>
                                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '0.95rem', color: '#1f2937', fontWeight: 600 }}>
                                                                {obtainedSum}
                                                            </td>
                                                        </tr>
                                                        {subject.components.map((c, ci) => (
                                                            <tr key={`${index}-${ci}`} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                                <td style={{ padding: '10px 16px 10px 36px', fontSize: '0.9rem', color: '#374151' }}>
                                                                    ↳ {c.name}
                                                                </td>
                                                                <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.9rem', color: '#6b7280' }}>
                                                                    {c.maxMarks}
                                                                </td>
                                                                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                                                    <input
                                                                        type="number"
                                                                        value={c.marksObtained}
                                                                        onChange={(e) => handleComponentChange(index, ci, e.target.value)}
                                                                        min="0"
                                                                        max={c.maxMarks}
                                                                        step="0.5"
                                                                        placeholder="0"
                                                                        required
                                                                        style={{
                                                                            width: '100%',
                                                                            maxWidth: '120px',
                                                                            padding: '8px 12px',
                                                                            border: '1px solid #d1d5db',
                                                                            borderRadius: '6px',
                                                                            fontSize: '0.9rem',
                                                                            textAlign: 'center'
                                                                        }}
                                                                    />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px 16px',
                                    backgroundColor: '#f9fafb',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#374151' }}>
                                        Total:
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1f2937' }}>
                                        {marksData.reduce((sum, s) => sum + subjectObtainedTotal(s), 0)} / {marksData.reduce((sum, s) => sum + (parseFloat(s.maxMarks) || 0), 0)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {selectedExamId && marksData.length === 0 && !error && (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: '#6b7280',
                                backgroundColor: '#fef3c7',
                                borderRadius: '8px',
                                border: '1px solid #fbbf24'
                            }}>
                                <p style={{ margin: 0, color: '#92400e' }}>
                                    This exam has no subjects configured. Please contact admin.
                                </p>
                            </div>
                        )}

                        {!selectedExamId && (
                            <div style={{
                                padding: '40px 20px',
                                textAlign: 'center',
                                color: '#6b7280',
                                backgroundColor: '#f9fafb',
                                borderRadius: '8px',
                                border: '1px dashed #d1d5db'
                            }}>
                                <p style={{ margin: 0 }}>Please select an exam to enter marks</p>
                            </div>
                        )}
                    </div>

                    <div className="form-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !selectedExamId}
                        >
                            {loading ? (isEdit ? 'Saving…' : 'Uploading...') : (isEdit ? 'Save Changes' : 'Upload Marks')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UploadMarksForm;
