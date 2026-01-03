import React, { useState } from 'react';
import RecordFeePaymentForm from '../forms/RecordFeePaymentForm';
import EditStudentForm from '../forms/EditStudentForm';
import ViewFeeDetailsModal from './ViewFeeDetailsModal';
import ViewExamResultsModal from './ViewExamResultsModal';
import ViewAttendanceModal from './ViewAttendanceModal';
import './Modals.css';

function StudentDetailsModal({ student, onClose, onUpdate }) {
    const [showRecordPayment, setShowRecordPayment] = useState(false);
    const [showEditStudent, setShowEditStudent] = useState(false);
    const [showFeeDetails, setShowFeeDetails] = useState(false);
    const [showExamResults, setShowExamResults] = useState(false);
    const [showAttendance, setShowAttendance] = useState(false);

    if (!student) return null;

    const handlePaymentSuccess = () => {
        setShowRecordPayment(false);
        if (onUpdate) onUpdate();
    };

    const handleEditSuccess = () => {
        setShowEditStudent(false);
        if (onUpdate) onUpdate();
    };

    return (
        <>
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <div>
                            <h2>{student.fullName}</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                                {student.rollNumber} • {student.class}
                            </p>
                        </div>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>

                    <div className="modal-body">
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
                                    <label>Date of Birth</label>
                                    <span>{student.dateOfBirth || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Class</label>
                                    <span>{student.class}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Admission Date</label>
                                    <span>{student.admissionDate || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Status</label>
                                    <span className={`status-badge ${student.status?.toLowerCase()}`}>
                                        {student.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="details-section">
                            <h3>Parent/Guardian Information</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Parent Name</label>
                                    <span>{student.parentName || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Phone</label>
                                    <span>{student.parentPhone || 'N/A'}</span>
                                </div>
                                <div className="detail-item detail-item-full">
                                    <label>Email</label>
                                    <span>{student.parentEmail || 'N/A'}</span>
                                </div>
                                <div className="detail-item detail-item-full">
                                    <label>Address</label>
                                    <span>{student.address || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="details-section">
                            <h3>Login Credentials</h3>
                            <div className="details-grid">
                                <div className="detail-item">
                                    <label>Username (Roll Number)</label>
                                    <span style={{fontFamily: 'monospace', fontWeight: '600'}}>{student.rollNumber}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Password</label>
                                    <span style={{fontFamily: 'monospace', fontWeight: '600', color: '#059669'}}>
                                        {student.plainPassword || 'Not Available'}
                                    </span>
                                </div>
                            </div>
                            <small style={{color: '#6b7280', fontSize: '0.85rem', display: 'block', marginTop: '8px'}}>
                                Students use their roll number and password to log in to the student portal
                            </small>
                        </div>

                        <div className="details-section">
                            <h3>Quick Actions</h3>
                            <div className="actions-grid">
                                <button
                                    className="action-btn primary-action"
                                    onClick={() => setShowRecordPayment(true)}
                                >
                                    💰 Record Fee Payment
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => setShowFeeDetails(true)}
                                >
                                    💳 View Fee Details
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => setShowExamResults(true)}
                                >
                                    📊 View Exam Results
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => setShowAttendance(true)}
                                >
                                    📝 View Attendance
                                </button>
                                <button
                                    className="action-btn"
                                    onClick={() => setShowEditStudent(true)}
                                >
                                    ✏️ Edit Student Details
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button onClick={onClose} className="btn btn-secondary">
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {showRecordPayment && (
                <RecordFeePaymentForm
                    preselectedStudent={student}
                    onClose={() => setShowRecordPayment(false)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
            {showEditStudent && (
                <EditStudentForm
                    student={student}
                    onClose={() => setShowEditStudent(false)}
                    onSuccess={handleEditSuccess}
                />
            )}
            {showFeeDetails && (
                <ViewFeeDetailsModal
                    student={student}
                    onClose={() => setShowFeeDetails(false)}
                />
            )}
            {showExamResults && (
                <ViewExamResultsModal
                    student={student}
                    onClose={() => setShowExamResults(false)}
                />
            )}
            {showAttendance && (
                <ViewAttendanceModal
                    student={student}
                    onClose={() => setShowAttendance(false)}
                />
            )}
        </>
    );
}

export default StudentDetailsModal;
