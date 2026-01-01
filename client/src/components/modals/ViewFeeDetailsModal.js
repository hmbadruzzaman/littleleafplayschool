import React, { useState, useEffect } from 'react';
import './Modals.css';

function ViewFeeDetailsModal({ student, onClose }) {
    const [fees, setFees] = useState([]);
    const [pendingData, setPendingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchFeeDetails();
        fetchPendingFees();
    }, [student.studentId]);

    const fetchFeeDetails = async () => {
        try {
            if (!student.studentId) {
                setError('Student ID is missing. Please try refreshing the page.');
                setLoading(false);
                return;
            }

            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';
            const encodedStudentId = encodeURIComponent(student.studentId);
            const response = await fetch(`${API_URL}/admin/students/${encodedStudentId}/fees`, {
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

    const fetchPendingFees = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';
            const encodedStudentId = encodeURIComponent(student.studentId);
            const response = await fetch(`${API_URL}/admin/students/${encodedStudentId}/pending-fees`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            console.log('Pending fees API response:', data);

            if (data.success) {
                console.log('Setting pending data:', data.data);
                console.log('Total pending from API:', data.data.totalPending);
                setPendingData(data.data);
            }
        } catch (err) {
            console.error('Error fetching pending fees:', err);
        }
    };

    const getTotalExpected = () => {
        // Total expected is paid + pending (based on fee structures)
        const paid = getPaidAmount();
        const pending = getPendingAmount();
        return paid + pending;
    };

    const getPaidAmount = () => {
        return fees
            .filter(fee => fee.paymentStatus === 'PAID')
            .reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0);
    };

    const getPendingAmount = () => {
        // Use the accurate pending calculation from the API
        return pendingData?.totalPending || 0;
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
                                        <label>Total Expected</label>
                                        <span className="fee-amount">₹{getTotalExpected().toFixed(2)}</span>
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

                            {pendingData && pendingData.breakdown && pendingData.breakdown.length > 0 && (
                                <div className="details-section">
                                    <h3>Pending Breakdown by Category</h3>
                                    <div className="fee-table-container">
                                        <table className="fee-details-table">
                                            <thead>
                                                <tr>
                                                    <th>Fee Type</th>
                                                    <th>Frequency</th>
                                                    <th>Structure Amount</th>
                                                    <th>Pending Amount</th>
                                                    <th>Details</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pendingData.breakdown.map((item, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <strong>{item.feeType.replace(/_/g, ' ')}</strong>
                                                        </td>
                                                        <td>
                                                            <span className="status-badge" style={{
                                                                backgroundColor: item.frequency === 'ONE_TIME' ? '#dbeafe' : '#fef3c7',
                                                                color: item.frequency === 'ONE_TIME' ? '#1e40af' : '#92400e'
                                                            }}>
                                                                {item.frequency === 'ONE_TIME' ? 'One Time' : 'Monthly'}
                                                            </span>
                                                        </td>
                                                        <td>₹{parseFloat(item.structureAmount || 0).toFixed(2)}</td>
                                                        <td>
                                                            <strong style={{ color: '#dc2626' }}>
                                                                ₹{parseFloat(item.pendingAmount || 0).toFixed(2)}
                                                            </strong>
                                                        </td>
                                                        <td>
                                                            {item.frequency === 'MONTHLY' && item.months && item.months.length > 0 ? (
                                                                <details style={{ cursor: 'pointer' }}>
                                                                    <summary style={{ color: '#2563eb', fontWeight: '500' }}>
                                                                        {item.months.length} month{item.months.length > 1 ? 's' : ''} pending
                                                                    </summary>
                                                                    <ul style={{
                                                                        marginTop: '8px',
                                                                        paddingLeft: '20px',
                                                                        fontSize: '0.9rem',
                                                                        color: '#6b7280'
                                                                    }}>
                                                                        {item.months.map((month, idx) => (
                                                                            <li key={idx}>{month}</li>
                                                                        ))}
                                                                    </ul>
                                                                </details>
                                                            ) : item.frequency === 'ONE_TIME' && item.paidAmount !== undefined ? (
                                                                <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                                                    Paid: ₹{parseFloat(item.paidAmount || 0).toFixed(2)}
                                                                </span>
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr style={{ backgroundColor: '#fef2f2', fontWeight: 'bold' }}>
                                                    <td colSpan="3" style={{ textAlign: 'right', paddingRight: '16px' }}>
                                                        Total Pending:
                                                    </td>
                                                    <td colSpan="2" style={{ color: '#dc2626', fontSize: '1.1rem' }}>
                                                        ₹{parseFloat(pendingData.totalPending || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

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
