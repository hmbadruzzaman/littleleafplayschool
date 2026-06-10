import React, { useState, useEffect } from 'react';
import UploadMarksForm from '../forms/UploadMarksForm';
import { formatExamDateRange, formatDate, subjectDate, examHasPerSubjectDates } from '../../utils/examDates';
import './Modals.css';

function TeacherStudentDetailsModal({ student, onClose }) {
    const [exams, setExams] = useState([]);
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [selectedExamIds, setSelectedExamIds] = useState([]);

    const MAX_SHEETS = 4;

    const toggleSelected = (examId) => {
        setSelectedExamIds(prev => {
            if (prev.includes(examId)) return prev.filter(id => id !== examId);
            if (prev.length >= MAX_SHEETS) return prev;
            return [...prev, examId];
        });
    };

    const printSelected = () => {
        if (selectedExamIds.length === 0) return;
        const ids = selectedExamIds.map(encodeURIComponent).join(',');
        window.open(`/marksheet/${encodeURIComponent(student.studentId)}/${ids}`, '_blank');
    };

    useEffect(() => {
        fetchData();
    }, [student.studentId]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            // Fetch exams for the student's class
            const examsResponse = await fetch(`${API_URL}/teacher/exams?class=${encodeURIComponent(student.class)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const examsData = await examsResponse.json();

            // Fetch marks for this student
            const marksResponse = await fetch(`${API_URL}/teacher/marks/${encodeURIComponent(student.studentId)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const marksData = await marksResponse.json();

            if (examsData.success) {
                setExams(examsData.data || []);
            }

            if (marksData.success) {
                setMarks(marksData.data || []);
            }
        } catch (err) {
            setError('Error fetching data');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getMarksForExam = (examId) => {
        return marks.find(m => m.examId === examId);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Student Details - {student.fullName}</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                            {student.rollNumber} | {student.class}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <p>Loading student details...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <>
                            <div className="details-section">
                                <h3>Personal Information</h3>
                                <div className="details-grid">
                                    <div className="detail-item">
                                        <label>Full Name</label>
                                        <span>{student.fullName}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Roll Number</label>
                                        <span>{student.rollNumber}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Class</label>
                                        <span>{student.class}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Date of Birth</label>
                                        <span>{student.dateOfBirth || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Parent Name</label>
                                        <span>{student.parentName || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Parent Phone</label>
                                        <span>{student.parentPhone || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Address</label>
                                        <span>{student.address || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Status</label>
                                        <span className={`status-badge ${student.status.toLowerCase()}`}>
                                            {student.status}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="details-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: 10, flexWrap: 'wrap' }}>
                                    <h3 style={{ margin: 0 }}>Exam Results</h3>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={printSelected}
                                            disabled={selectedExamIds.length === 0}
                                            className="btn btn-secondary"
                                            style={{ opacity: selectedExamIds.length === 0 ? 0.5 : 1 }}
                                            title={selectedExamIds.length === 0 ? 'Select one or more exams with marks to print' : ''}
                                        >
                                            Print Mark Sheet ({selectedExamIds.length}/{MAX_SHEETS})
                                        </button>
                                        <button
                                            onClick={() => setShowUploadForm(true)}
                                            className="btn btn-primary"
                                        >
                                            Upload Marks
                                        </button>
                                    </div>
                                </div>

                                {exams.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                                        No exams found for this class
                                    </p>
                                ) : (
                                    <div className="exams-list">
                                        {exams.map((exam, index) => {
                                            const examMarks = getMarksForExam(exam.examId);
                                            return (
                                                <div key={index} className="exam-card">
                                                    <div className="exam-header">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            {examMarks && (() => {
                                                                const isChecked = selectedExamIds.includes(exam.examId);
                                                                const atCap = !isChecked && selectedExamIds.length >= MAX_SHEETS;
                                                                return (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={() => toggleSelected(exam.examId)}
                                                                        disabled={atCap}
                                                                        title={atCap ? `Maximum ${MAX_SHEETS} exams per mark sheet` : 'Include in mark sheet'}
                                                                        style={{ width: 18, height: 18, cursor: atCap ? 'not-allowed' : 'pointer', opacity: atCap ? 0.4 : 1 }}
                                                                    />
                                                                );
                                                            })()}
                                                            <div>
                                                                <h4 style={{ margin: '0 0 4px 0' }}>{exam.examName}</h4>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                                                                    {exam.examType} | {formatExamDateRange(exam)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        {examMarks ? (
                                                            <span className="status-badge active">Submitted</span>
                                                        ) : (
                                                            <span className="status-badge pending">Pending</span>
                                                        )}
                                                    </div>

                                                    {examMarks && examMarks.subjects && (() => {
                                                        const showDateCol = examHasPerSubjectDates(exam);
                                                        const dateForSubject = (subjName) => {
                                                            const examSubj = (exam.subjects || []).find(s => s.name === subjName);
                                                            return subjectDate(exam, examSubj);
                                                        };
                                                        return (
                                                        <div className="marks-table" style={{ marginTop: '12px' }}>
                                                            <table style={{ width: '100%', fontSize: '0.9rem' }}>
                                                                <thead>
                                                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Subject</th>
                                                                        {showDateCol && <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Date</th>}
                                                                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Marks Obtained</th>
                                                                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Max Marks</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {examMarks.subjects.map((subject, idx) => {
                                                                        const hasComps = Array.isArray(subject.components) && subject.components.length > 0;
                                                                        return (
                                                                            <React.Fragment key={idx}>
                                                                                <tr style={hasComps ? { backgroundColor: '#f9fafb', fontWeight: 600 } : {}}>
                                                                                    <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{subject.name}</td>
                                                                                    {showDateCol && <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 400 }}>{formatDate(dateForSubject(subject.name))}</td>}
                                                                                    <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>{subject.marksObtained}</td>
                                                                                    <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>{subject.maxMarks}</td>
                                                                                </tr>
                                                                                {hasComps && subject.components.map((c, ci) => (
                                                                                    <tr key={`${idx}-${ci}`}>
                                                                                        <td style={{ padding: '6px 8px 6px 24px', borderBottom: '1px solid #e5e7eb', color: '#374151', fontSize: '0.85rem' }}>↳ {c.name}</td>
                                                                                        {showDateCol && <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}></td>}
                                                                                        <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem' }}>{c.marksObtained}</td>
                                                                                        <td style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', fontSize: '0.85rem' }}>{c.maxMarks}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </React.Fragment>
                                                                        );
                                                                    })}
                                                                    <tr style={{ fontWeight: '600', backgroundColor: '#f9fafb' }}>
                                                                        <td style={{ padding: '8px' }}>Total</td>
                                                                        {showDateCol && <td />}
                                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                            {examMarks.subjects.reduce((sum, s) => sum + (parseInt(s.marksObtained) || 0), 0)}
                                                                        </td>
                                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                            {examMarks.subjects.reduce((sum, s) => sum + (parseInt(s.maxMarks) || 0), 0)}
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        );
                                                    })()}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">
                        Close
                    </button>
                </div>

                {showUploadForm && (
                    <UploadMarksForm
                        student={student}
                        exams={exams}
                        onClose={() => setShowUploadForm(false)}
                        onSuccess={() => {
                            setShowUploadForm(false);
                            fetchData();
                        }}
                    />
                )}
            </div>
        </div>
    );
}

export default TeacherStudentDetailsModal;
