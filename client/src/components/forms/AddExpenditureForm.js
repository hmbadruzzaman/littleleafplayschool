import React, { useState } from 'react';
import './Forms.css';

function AddExpenditureForm({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        expenseType: 'SALARY',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        comment: ''
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
            const response = await fetch('http://localhost:5001/api/admin/expenditures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                if (onSuccess) onSuccess();
                onClose();
            } else {
                setError(data.message || 'Failed to add expenditure');
            }
        } catch (err) {
            setError('An error occurred while adding expenditure');
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Expenditure</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-body">
                        {error && <div className="error-message">{error}</div>}

                        <div className="form-group">
                            <label>Expense Type *</label>
                            <select
                                name="expenseType"
                                value={formData.expenseType}
                                onChange={handleChange}
                                required
                            >
                                <option value="SALARY">Salary</option>
                                <option value="INFRASTRUCTURE">Infrastructure</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="SUPPLIES">Supplies</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="MISC">Miscellaneous</option>
                            </select>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Amount (₹) *</label>
                                <input
                                    type="number"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    placeholder="Enter amount"
                                    min="0"
                                    step="0.01"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Date *</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Comment</label>
                            <textarea
                                name="comment"
                                value={formData.comment}
                                onChange={handleChange}
                                placeholder="Add any additional details..."
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="form-footer">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Expenditure'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddExpenditureForm;
