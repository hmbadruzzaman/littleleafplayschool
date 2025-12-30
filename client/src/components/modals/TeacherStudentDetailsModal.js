import React, { useState, useEffect } from 'react';
import UploadMarksForm from '../forms/UploadMarksForm';
import './Modals.css';

function TeacherStudentDetailsModal({ student, onClose }) {
    const [exams, setExams] = useState([]);
    const [marks, setMarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showUploadForm, setShowUploadForm] = useState(false);

    useEffect(() => {
        fetchData();
    }, [student.studentId]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');

            // Fetch exams for the student's class
            const examsResponse = await fetch(`https://welittleleaf.com/api/teacher/exams?class=${encodeURIComponent(student.class)}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const examsData = await examsResponse.json();

            // Fetch marks for this student
            const marksResponse = await fetch(`https://welittleleaf.com/api/teacher/marks/${encodeURIComponent(student.studentId)}`, {
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0 }}>Exam Results</h3>
                                    <button
                                        onClick={() => setShowUploadForm(true)}
                                        className="btn btn-primary"
                                    >
                                        Upload Marks
                                    </button>
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
                                                        <div>
                                                            <h4 style={{ margin: '0 0 4px 0' }}>{exam.examName}</h4>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
                                                                {exam.examType} | {exam.examDate}
                                                            </p>
                                                        </div>
                                                        {examMarks ? (
                                                            <span className="status-badge active">Submitted</span>
                                                        ) : (
                                                            <span className="status-badge pending">Pending</span>
                                                        )}
                                                    </div>

                                                    {examMarks && examMarks.subjects && (
                                                        <div className="marks-table" style={{ marginTop: '12px' }}>
                                                            <table style={{ width: '100%', fontSize: '0.9rem' }}>
                                                                <thead>
                                                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Subject</th>
                                                                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Marks Obtained</th>
                                                                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Max Marks</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {examMarks.subjects.map((subject, idx) => (
                                                                        <tr key={idx}>
                                                                            <td style={{ padding: '8px', borderBottom: '1px solid #e5e7eb' }}>{subject.name}</td>
                                                                            <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>{subject.marksObtained}</td>
                                                                            <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>{subject.maxMarks}</td>
                                                                        </tr>
                                                                    ))}
                                                                    <tr style={{ fontWeight: '600', backgroundColor: '#f9fafb' }}>
                                                                        <td style={{ padding: '8px' }}>Total</td>
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
                                                    )}
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
