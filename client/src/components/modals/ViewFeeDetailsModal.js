import React, { useState, useEffect } from 'react';
import './Modals.css';

function ViewFeeDetailsModal({ student, onClose }) {
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchFeeDetails();
    }, [student.studentId]);

    const fetchFeeDetails = async () => {
        try {
            if (!student.studentId) {
                setError('Student ID is missing. Please try refreshing the page.');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            const encodedStudentId = encodeURIComponent(student.studentId);
            const response = await fetch(`http://localhost:5001/api/admin/students/${encodedStudentId}/fees`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                setFees(data.data || []);
            } else {
                setError(data.message || 'Failed to fetch fee details');
            }
        } catch (err) {
            setError('An error occurred while fetching fee details');
            console.error('Error fetching fees:', err);
        } finally {
            setLoading(false);
        }
    };

    const getTotalAmount = () => {
        return fees.reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0);
    };

    const getPaidAmount = () => {
        return fees
            .filter(fee => fee.paymentStatus === 'PAID')
            .reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0);
    };

    const getPendingAmount = () => {
        return fees
            .filter(fee => fee.paymentStatus !== 'PAID')
            .reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Fee Details - {student.fullName}</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                            {student.rollNumber}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <p>Loading fee details...</p>
                        </div>
                    ) : error ? (
                        <div className="error-message">{error}</div>
                    ) : (
                        <>
                            <div className="details-section">
                                <h3>Fee Summary</h3>
                                <div className="fee-summary-grid">
                                    <div className="fee-summary-card">
                                        <label>Total Fees</label>
                                        <span className="fee-amount">₹{getTotalAmount().toFixed(2)}</span>
                                    </div>
                                    <div className="fee-summary-card paid">
                                        <label>Paid</label>
                                        <span className="fee-amount">₹{getPaidAmount().toFixed(2)}</span>
                                    </div>
                                    <div className="fee-summary-card pending">
                                        <label>Pending</label>
                                        <span className="fee-amount">₹{getPendingAmount().toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="details-section">
                                <h3>Fee Records</h3>
                                {fees.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
                                        No fee records found for this student
                                    </p>
                                ) : (
                                    <div className="fee-table-container">
                                        <table className="fee-details-table">
                                            <thead>
                                                <tr>
                                                    <th>Fee Type</th>
                                                    <th>Amount</th>
                                                    <th>Due Date</th>
                                                    <th>Status</th>
                                                    <th>Payment Date</th>
                                                    <th>Payment Method</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fees.map((fee, index) => (
                                                    <tr key={index}>
                                                        <td>{fee.feeType || 'N/A'}</td>
                                                        <td>₹{parseFloat(fee.amount || 0).toFixed(2)}</td>
                                                        <td>{fee.dueDate || 'N/A'}</td>
                                                        <td>
                                                            <span className={`status-badge ${fee.paymentStatus?.toLowerCase()}`}>
                                                                {fee.paymentStatus || 'PENDING'}
                                                            </span>
                                                        </td>
                                                        <td>{fee.paymentDate || '-'}</td>
                                                        <td>{fee.paymentMethod || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
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
            </div>
        </div>
    );
}

export default ViewFeeDetailsModal;
