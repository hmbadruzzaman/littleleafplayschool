import React, { useState } from 'react';
import './Forms.css';

function AddExamForm({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        examName: '',
        class: 'Pre-KG A',
        examType: 'MONTHLY',
        examDate: '',
        totalMarks: '100'
    });
    const [subjects, setSubjects] = useState([]);
    const [newSubject, setNewSubject] = useState({ name: '', maxMarks: '' });
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
        if (newSubject.name && newSubject.maxMarks) {
            setSubjects([...subjects, { ...newSubject }]);
            setNewSubject({ name: '', maxMarks: '' });
        }
    };

    const handleRemoveSubject = (index) => {
        setSubjects(subjects.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (subjects.length === 0) {
            setError('Please add at least one subject');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5001/api/admin/exams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    subjects
                })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess();
                onClose();
            } else {
                setError(data.message || 'Failed to create exam');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error creating exam:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Create New Exam</h2>
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
                                <option value="Pre-KG A">Pre-KG A</option>
                                <option value="Pre-KG B">Pre-KG B</option>
                                <option value="LKG A">LKG A</option>
                                <option value="LKG B">LKG B</option>
                                <option value="UKG A">UKG A</option>
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
                        <label>Exam Date *</label>
                        <input
                            type="date"
                            name="examDate"
                            value={formData.examDate}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Subjects *</label>
                        <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', padding: '16px', backgroundColor: '#f9fafb' }}>
                            <div className="form-row" style={{ marginBottom: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Subject name (e.g., English)"
                                    value={newSubject.name}
                                    onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                    style={{ flex: 1 }}
                                />
                                <input
                                    type="number"
                                    placeholder="Max marks"
                                    value={newSubject.maxMarks}
                                    onChange={(e) => setNewSubject({ ...newSubject, maxMarks: e.target.value })}
                                    min="1"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSubject}
                                    className="btn btn-primary"
                                    style={{ whiteSpace: 'nowrap' }}
                                >
                                    Add Subject
                                </button>
                            </div>

                            {subjects.length > 0 && (
                                <div style={{ marginTop: '12px' }}>
                                    <strong style={{ fontSize: '0.9rem', color: '#374151' }}>Added Subjects:</strong>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0' }}>
                                        {subjects.map((subject, index) => (
                                            <li
                                                key={index}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px 12px',
                                                    marginBottom: '6px',
                                                    backgroundColor: 'white',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e5e7eb'
                                                }}
                                            >
                                                <span style={{ fontSize: '0.9rem' }}>
                                                    {subject.name} - {subject.maxMarks} marks
                                                </span>
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
                                            </li>
                                        ))}
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
                            {loading ? 'Creating...' : 'Create Exam'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddExamForm;
