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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    if (!student) return null;

    const handlePaymentSuccess = () => {
        setShowRecordPayment(false);
        if (onUpdate) onUpdate();
    };

    const handleEditSuccess = () => {
        setShowEditStudent(false);
        if (onUpdate) onUpdate();
    };

    const handleDeleteStudent = async () => {
        setIsDeleting(true);
        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const encodedStudentId = encodeURIComponent(student.studentId);

            const response = await fetch(`${API_URL}/admin/students/${encodedStudentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                alert('Student deleted successfully along with all related data');
                if (onUpdate) onUpdate();
                onClose();
            } else {
                alert(data.message || 'Failed to delete student');
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('An error occurred while deleting the student');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleToggleStatus = async () => {
        const newStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const confirmMsg = newStatus === 'INACTIVE'
            ? `Mark ${student.fullName} as inactive? They will be hidden from reports and the active student list. Their pending dues will remain visible and can still be settled.`
            : `Reactivate ${student.fullName}? They will appear in the active student list again.`;
        if (!window.confirm(confirmMsg)) return;

        setIsUpdatingStatus(true);
        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';
            const res = await fetch(`${API_URL}/admin/students/${encodeURIComponent(student.studentId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Student marked as ${newStatus.toLowerCase()} successfully`);
                if (onUpdate) onUpdate();
                onClose();
            } else {
                alert(data.message || 'Failed to update student status');
            }
        } catch (error) {
            console.error('Error updating student status:', error);
            alert('An error occurred');
        } finally {
            setIsUpdatingStatus(false);
        }
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

                    <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleToggleStatus}
                                className="btn"
                                disabled={isUpdatingStatus}
                                style={{
                                    backgroundColor: student.status === 'ACTIVE' ? '#f59e0b' : '#10b981',
                                    color: 'white',
                                    border: 'none'
                                }}
                            >
                                {isUpdatingStatus
                                    ? 'Updating...'
                                    : student.status === 'ACTIVE' ? '⏸ Mark Inactive' : '▶ Mark Active'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="btn btn-danger"
                                style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                            >
                                🗑️ Delete Student
                            </button>
                        </div>
                        <button onClick={onClose} className="btn btn-secondary">Close</button>
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

            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2 style={{ color: '#ef4444' }}>⚠️ Confirm Delete</h2>
                            <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '15px' }}>
                                Are you sure you want to delete <strong>{student.fullName}</strong>?
                            </p>
                            <div style={{
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '8px',
                                padding: '15px',
                                marginBottom: '15px'
                            }}>
                                <p style={{ margin: '0 0 10px 0', fontWeight: '600', color: '#991b1b' }}>
                                    This action will permanently delete:
                                </p>
                                <ul style={{ margin: '0', paddingLeft: '20px', color: '#7f1d1d' }}>
                                    <li>Student profile and credentials</li>
                                    <li>All fee records (paid and pending)</li>
                                    <li>All exam results</li>
                                    <li>All attendance records</li>
                                    <li>User login account</li>
                                </ul>
                            </div>
                            <p style={{ color: '#991b1b', fontWeight: '600', margin: '10px 0' }}>
                                This action cannot be undone!
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn btn-secondary"
                                disabled={isDeleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteStudent}
                                className="btn btn-danger"
                                disabled={isDeleting}
                                style={{
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    border: 'none'
                                }}
                            >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default StudentDetailsModal;
