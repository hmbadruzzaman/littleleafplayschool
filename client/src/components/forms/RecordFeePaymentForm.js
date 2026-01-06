import React, { useState, useEffect } from 'react';
import './Forms.css';

function RecordFeePaymentForm({ onClose, onSuccess, preselectedStudent = null }) {
    const [students, setStudents] = useState([]);
    const [formData, setFormData] = useState({
        studentId: preselectedStudent?.studentId || '',
        rollNumber: preselectedStudent?.rollNumber || '',
        feeType: 'MONTHLY_FEE',
        amount: '',
        dueDate: '',
        month: '',
        academicYear: new Date().getFullYear().toString(),
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        transactionId: '',
        remarks: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!preselectedStudent) {
            fetchStudents();
        }
    }, [preselectedStudent]);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';
            const response = await fetch(`${API_URL}/admin/students`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setStudents(data.data);
            }
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleStudentSelect = (e) => {
        const selectedStudent = students.find(s => s.studentId === e.target.value);
        if (selectedStudent) {
            setFormData(prev => ({
                ...prev,
                studentId: selectedStudent.studentId,
                rollNumber: selectedStudent.rollNumber
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';
            const response = await fetch(`${API_URL}/admin/fees`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...formData,
                    paymentDate: formData.paymentStatus === 'PAID' ? new Date().toISOString().split('T')[0] : null
                })
            });

            const data = await response.json();

            if (data.success) {
                onSuccess();
                onClose();
            } else {
                setError(data.message || 'Failed to record fee payment');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error recording fee payment:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Record Fee Payment</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

                    {!preselectedStudent ? (
                        <div className="form-group">
                            <label>Select Student *</label>
                            <select
                                name="studentId"
                                value={formData.studentId}
                                onChange={handleStudentSelect}
                                required
                            >
                                <option value="">-- Select Student --</option>
                                {students.map(student => (
                                    <option key={student.studentId} value={student.studentId}>
                                        {student.rollNumber} - {student.fullName} ({student.class})
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Student</label>
                            <input
                                type="text"
                                value={`${preselectedStudent.rollNumber} - ${preselectedStudent.fullName}`}
                                disabled
                                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                            />
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Fee Type *</label>
                            <select
                                name="feeType"
                                value={formData.feeType}
                                onChange={handleChange}
                                required
                            >
                                <option value="ADMISSION_FEE">Admission Fee</option>
                                <option value="MONTHLY_FEE">Monthly Tuition Fee</option>
                                <option value="ANNUAL_FEE">Annual Fee</option>
                                <option value="EXAM_FEE">Exam Fee</option>
                                <option value="TRANSPORT_FEE">Transport Fee</option>
                                <option value="MISC">Miscellaneous</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Amount (₹) *</label>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="e.g., 3000"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    {(formData.feeType === 'MONTHLY_FEE' || formData.feeType === 'TRANSPORT_FEE') && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Month *</label>
                                <select
                                    name="month"
                                    value={formData.month}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">-- Select Month --</option>
                                    <option value="January">January</option>
                                    <option value="February">February</option>
                                    <option value="March">March</option>
                                    <option value="April">April</option>
                                    <option value="May">May</option>
                                    <option value="June">June</option>
                                    <option value="July">July</option>
                                    <option value="August">August</option>
                                    <option value="September">September</option>
                                    <option value="October">October</option>
                                    <option value="November">November</option>
                                    <option value="December">December</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Academic Year *</label>
                                <select
                                    name="academicYear"
                                    value={formData.academicYear}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value={`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`}>
                                        {new Date().getFullYear() - 1}-{new Date().getFullYear()}
                                    </option>
                                    <option value={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}>
                                        {new Date().getFullYear()}-{new Date().getFullYear() + 1}
                                    </option>
                                    <option value={`${new Date().getFullYear() + 1}-${new Date().getFullYear() + 2}`}>
                                        {new Date().getFullYear() + 1}-{new Date().getFullYear() + 2}
                                    </option>
                                </select>
                            </div>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Due Date *</label>
                            <input
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Payment Status *</label>
                            <select
                                name="paymentStatus"
                                value={formData.paymentStatus}
                                onChange={handleChange}
                                required
                            >
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="OVERDUE">Overdue</option>
                            </select>
                        </div>
                    </div>

                    {formData.paymentStatus === 'PAID' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label>Payment Method *</label>
                                <select
                                    name="paymentMethod"
                                    value={formData.paymentMethod}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="CASH">Cash</option>
                                    <option value="CARD">Card</option>
                                    <option value="UPI">UPI</option>
                                    <option value="NET_BANKING">Net Banking</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Transaction ID</label>
                                <input
                                    type="text"
                                    name="transactionId"
                                    value={formData.transactionId}
                                    onChange={handleChange}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label>Remarks</label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            placeholder="Optional notes"
                            rows="3"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Recording...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RecordFeePaymentForm;
