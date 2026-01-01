import React, { useState } from 'react';
import './Forms.css';

function AddFeeForm({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        feeType: 'ADMISSION_FEE',
        amount: '',
        frequency: 'ONE_TIME'
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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

            const response = await fetch(`${API_URL}/admin/fee-structure`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                onSuccess();
                onClose();
            } else {
                setError(data.message || 'Failed to add fee structure');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error adding fee structure:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Add Fee Structure</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

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
                        <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                            This defines the standard fee amount for this type
                        </small>
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
                        <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                            Standard amount for this fee type
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Frequency *</label>
                        <select
                            name="frequency"
                            value={formData.frequency}
                            onChange={handleChange}
                            required
                        >
                            <option value="ONE_TIME">One Time (Admission, Annual, etc.)</option>
                            <option value="MONTHLY">Monthly (Tuition, Transport, etc.)</option>
                        </select>
                        <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                            How often this fee should be charged
                        </small>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Fee Structure'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddFeeForm;
