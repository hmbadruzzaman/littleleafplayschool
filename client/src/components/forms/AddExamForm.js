import React, { useState } from 'react';
import './Forms.css';

function AddExamForm({ onClose, onSuccess, exam = null }) {
    const isEdit = !!exam;
    const subjectsLocked = isEdit && !!exam.hasResults;

    const [formData, setFormData] = useState({
        examName: exam?.examName ?? '',
        class: exam?.class ?? 'Play',
        examType: exam?.examType ?? 'MONTHLY',
        totalMarks: exam?.totalMarks?.toString() ?? '100'
    });
    // When editing an old exam whose subjects don't have per-subject dates yet,
    // pre-fill each subject's date with the exam-level date so admin sees something.
    const initialSubjects = (exam?.subjects ?? []).map(s => ({
        ...s,
        examDate: s.examDate || exam?.examDate || '',
    }));
    const [subjects, setSubjects] = useState(initialSubjects);
    const [newSubject, setNewSubject] = useState({ name: '', maxMarks: '', examDate: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddSubject = () => {
        if (newSubject.name && newSubject.maxMarks && newSubject.examDate) {
            setSubjects([...subjects, { ...newSubject }]);
            setNewSubject({ name: '', maxMarks: '', examDate: '' });
        }
    };

    const updateSubjectDate = (index, value) => {
        setSubjectAt(index, s => ({ ...s, examDate: value }));
    };

    const handleRemoveSubject = (index) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const setSubjectAt = (index, updater) => {
        setSubjects(prev => prev.map((s, i) => (i === index ? updater(s) : s)));
    };

    const componentMaxSum = (s) => (s.components || []).reduce((sum, c) => sum + (Number(c.maxMarks) || 0), 0);

    const displayedSubjectMax = (s) => (
        s.components && s.components.length > 0 ? componentMaxSum(s) : s.maxMarks
    );

    const startComponents = (index) => {
        setSubjectAt(index, s => ({ ...s, components: [{ name: '', maxMarks: '' }] }));
    };

    const stopComponents = (index) => {
        setSubjectAt(index, s => {
            const { components, ...rest } = s;
            return rest;
        });
    };

    const addComponentRow = (index) => {
        setSubjectAt(index, s => ({
            ...s,
            components: [...(s.components || []), { name: '', maxMarks: '' }],
        }));
    };

    const updateComponent = (index, ci, field, value) => {
        setSubjectAt(index, s => ({
            ...s,
            components: (s.components || []).map((c, j) => (j === ci ? { ...c, [field]: value } : c)),
        }));
    };

    const removeComponent = (index, ci) => {
        setSubjectAt(index, s => ({
            ...s,
            components: (s.components || []).filter((_, j) => j !== ci),
        }));
    };

    const subjectsForSubmit = () => subjects.map(s => {
        if (s.components && s.components.length > 0) {
            const cleanComponents = s.components.map(c => ({
                name: c.name,
                maxMarks: Number(c.maxMarks) || 0,
            }));
            return {
                name: s.name,
                examDate: s.examDate,
                maxMarks: cleanComponents.reduce((sum, c) => sum + c.maxMarks, 0),
                components: cleanComponents,
            };
        }
        return { name: s.name, examDate: s.examDate, maxMarks: Number(s.maxMarks) || 0 };
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (subjects.length === 0) {
            setError('Please add at least one subject');
            return;
        }

        // Each subject needs a date (YYYY-MM-DD).
        for (const s of subjects) {
            if (!s.examDate) {
                setError(`"${s.name || '(unnamed)'}" needs an exam date.`);
                return;
            }
        }

        // Validate components (when used): each row needs a name and a positive max.
        for (const s of subjects) {
            if (s.components && s.components.length > 0) {
                for (const c of s.components) {
                    if (!c.name || !c.maxMarks || Number(c.maxMarks) <= 0) {
                        setError(`Each component of "${s.name}" needs a name and a positive max marks.`);
                        return;
                    }
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

            const url = isEdit
                ? `${API_URL}/admin/exams/${encodeURIComponent(exam.examId)}`
                : `${API_URL}/admin/exams`;

            // On edit, only send subjects/totalMarks if they can still be changed.
            // (Server enforces this too; we just avoid sending fields the server
            // is going to drop.)
            const body = subjectsLocked
                ? { ...formData, totalMarks: undefined, subjects: undefined }
                : { ...formData, subjects: subjectsForSubmit() };

            const response = await fetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (data.success) {
                onSuccess();
                onClose();
            } else {
                setError(data.message || (isEdit ? 'Failed to update exam' : 'Failed to create exam'));
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(isEdit ? 'Error updating exam:' : 'Error creating exam:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{isEdit ? 'Edit Exam' : 'Create New Exam'}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Exam Name *</label>
                        <input
                            type="text"
                            name="examName"
                            value={formData.examName}
                            onChange={handleChange}
                            placeholder="e.g., Mid-Term Assessment"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Class *</label>
                            <select
                                name="class"
                                value={formData.class}
                                onChange={handleChange}
                                required
                            >
                                <option value="Play">Play</option>
                                <option value="Nursery">Nursery</option>
                                <option value="LKG">LKG</option>
                                <option value="UKG">UKG</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Exam Type *</label>
                            <select
                                name="examType"
                                value={formData.examType}
                                onChange={handleChange}
                                required
                            >
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Quarterly</option>
                                <option value="HALF_YEARLY">Half Yearly</option>
                                <option value="ANNUAL">Annual</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Subjects *</label>
                        {subjectsLocked && (
                            <p style={{ fontSize: '0.85rem', color: '#92400e', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', padding: '10px 12px', margin: '0 0 10px 0' }}>
                                Subjects and max marks are locked because marks have been recorded for this exam.
                            </p>
                        )}
                        <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '16px', backgroundColor: '#f9fafb' }}>
                            <div className="form-row" style={{ marginBottom: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Subject name (e.g., English)"
                                    value={newSubject.name}
                                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                    disabled={subjectsLocked}
                                    style={{ flex: 2 }}
                                />
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={newSubject.maxMarks}
                                    onChange={(e) => setNewSubject({ ...newSubject, maxMarks: e.target.value })}
                                    min="1"
                                    disabled={subjectsLocked}
                                    style={{ flex: 1 }}
                                />
                                <input
                                    type="date"
                                    title="Date this subject is conducted"
                                    value={newSubject.examDate}
                                    onChange={(e) => setNewSubject({ ...newSubject, examDate: e.target.value })}
                                    disabled={subjectsLocked}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSubject}
                                    className="btn btn-primary"
                                    disabled={subjectsLocked}
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    Add Subject
                                </button>
                            </div>

                            {subjects.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <strong style={{ fontSize: '0.9rem', color: '#374151' }}>{subjectsLocked ? 'Subjects:' : 'Added Subjects:'}</strong>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                                        {subjects.map((subject, index) => {
                                            const hasComponents = subject.components && subject.components.length > 0;
                                            return (
                                                <li
                                                    key={index}
                                                    style={{
                                                        padding: '10px 12px',
                                                        marginBottom: '6px',
                                                        backgroundColor: 'white',
                                                        borderRadius: '4px',
                                                        border: '1px solid #e5e7eb'
                                                    }}
                                                >
                                                    {/* Subject row */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.9rem', flex: 1, minWidth: 0 }}>
                                                            {subject.name} — {displayedSubjectMax(subject)} marks
                                                            {hasComponents && <span style={{ color: '#6b7280', fontSize: '0.8rem' }}> (sum of components)</span>}
                                                        </span>
                                                        <input
                                                            type="date"
                                                            title="Date this subject is conducted"
                                                            value={subject.examDate || ''}
                                                            onChange={(e) => updateSubjectDate(index, e.target.value)}
                                                            disabled={subjectsLocked}
                                                            style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }}
                                                        />
                                                        {!subjectsLocked && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveSubject(index)}
                                                                style={{
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: '#ef4444',
                                                                    cursor: 'pointer',
                                                                    fontSize: '1.2rem',
                                                                    padding: '0 8px'
                                                                }}
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Components editor */}
                                                    {hasComponents && (
                                                        <div style={{ marginTop: '10px', paddingLeft: '14px', borderLeft: '2px solid #e5e7eb' }}>
                                                            {subject.components.map((c, ci) => (
                                                                <div key={ci} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Component name (e.g., Written)"
                                                                        value={c.name}
                                                                        onChange={(e) => updateComponent(index, ci, 'name', e.target.value)}
                                                                        disabled={subjectsLocked}
                                                                        style={{ flex: 2 }}
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Max"
                                                                        value={c.maxMarks}
                                                                        onChange={(e) => updateComponent(index, ci, 'maxMarks', e.target.value)}
                                                                        min="1"
                                                                        disabled={subjectsLocked}
                                                                        style={{ flex: 1 }}
                                                                    />
                                                                    {!subjectsLocked && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeComponent(index, ci)}
                                                                            style={{
                                                                                background: 'none', border: 'none',
                                                                                color: '#ef4444', cursor: 'pointer',
                                                                                fontSize: '1.1rem', padding: '0 6px',
                                                                            }}
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {!subjectsLocked && (
                                                                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => addComponentRow(index)}
                                                                        className="btn btn-secondary"
                                                                        style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                                                                    >
                                                                        + Add component
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => stopComponents(index)}
                                                                        style={{
                                                                            background: 'none', border: 'none',
                                                                            color: '#6b7280', cursor: 'pointer',
                                                                            fontSize: '0.8rem', textDecoration: 'underline',
                                                                        }}
                                                                    >
                                                                        Remove all components
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* "+ Add components" trigger when none yet */}
                                                    {!hasComponents && !subjectsLocked && (
                                                        <button
                                                            type="button"
                                                            onClick={() => startComponents(index)}
                                                            style={{
                                                                background: 'none', border: 'none',
                                                                color: '#4a5d3f', cursor: 'pointer',
                                                                fontSize: '0.8rem', padding: '6px 0 0 0',
                                                                textDecoration: 'underline',
                                                            }}
                                                        >
                                                            + Add components (e.g., Written, Viva)
                                                        </button>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}

                            {subjects.length === 0 && (
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '8px 0 0 0', textAlign: 'center' }}>
                                    No subjects added yet. Add at least one subject.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? (isEdit ? 'Saving…' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Exam')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddExamForm;
