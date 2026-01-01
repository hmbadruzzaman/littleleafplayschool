import React, { useState } from 'react';
import './Forms.css';

function UploadMarksForm({ student, exams, onClose, onSuccess }) {
    const [selectedExamId, setSelectedExamId] = useState('');
    const [marksData, setMarksData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleExamChange = (e) => {
        const examId = e.target.value;
        setSelectedExamId(examId);

        // Find the selected exam and initialize marks data
        const exam = exams.find(ex => ex.examId === examId);
        if (exam && exam.subjects && exam.subjects.length > 0) {
            const initialMarks = exam.subjects.map(subject => ({
                name: subject.name,
                maxMarks: subject.maxMarks,
                marksObtained: ''
            }));
            setMarksData(initialMarks);
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
        updatedMarks[index].marksObtained = value;
        setMarksData(updatedMarks);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate that all marks are entered
        const hasEmptyMarks = marksData.some(m => m.marksObtained === '');
        if (hasEmptyMarks) {
            setError('Please enter marks for all subjects');
            return;
        }

        // Validate that marks don't exceed max marks
        const hasInvalidMarks = marksData.some(m => {
            const obtained = parseFloat(m.marksObtained);
            const max = parseFloat(m.maxMarks);
            return obtained > max || obtained < 0;
        });

        if (hasInvalidMarks) {
            setError('Marks obtained cannot exceed maximum marks or be negative');
            return;
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
                        <h2>Upload Marks</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                            {student.fullName} ({student.rollNumber})
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-body">
                        {error && <div className="error-message">{error}</div>}

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
                                        {exam.examName} - {exam.examType} ({exam.examDate})
                                    </option>
                                ))}
                            </select>
                        </div>

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
                                            {marksData.map((subject, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '0.95rem' }}>
                                                        {subject.name}
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
                                            ))}
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
                                        {marksData.reduce((sum, s) => sum + (parseFloat(s.marksObtained) || 0), 0)} / {marksData.reduce((sum, s) => sum + parseFloat(s.maxMarks), 0)}
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
                            {loading ? 'Uploading...' : 'Upload Marks'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default UploadMarksForm;
