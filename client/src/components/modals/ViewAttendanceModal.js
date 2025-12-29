import React from 'react';
import './Modals.css';

function ViewAttendanceModal({ student, onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Attendance Records - {student.fullName}</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                            {student.rollNumber} • {student.class}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                        <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Attendance Tracking Coming Soon</h3>
                        <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                            This feature will display attendance records for {student.fullName}
                        </p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ViewAttendanceModal;
