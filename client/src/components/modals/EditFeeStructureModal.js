import React, { useState, useEffect } from 'react';
import './Modals.css';

function EditFeeStructureModal({ onClose, onSuccess }) {
    const [feeStructures, setFeeStructures] = useState([]);
    const [selectedStructure, setSelectedStructure] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        feeType: '',
        amount: '',
        frequency: ''
    });

    useEffect(() => {
        fetchFeeStructures();
    }, []);

    const fetchFeeStructures = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const response = await fetch(`${API_URL}/admin/fee-structure`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                setFeeStructures(data.data || []);
            }
        } catch (err) {
            console.error('Error fetching fee structures:', err);
            setError('Failed to load fee structures');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (structure) => {
        setSelectedStructure(structure);
        setFormData({
            feeType: structure.feeType,
            amount: structure.amount,
            frequency: structure.frequency
        });
        setEditMode(true);
    };

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

            // Only send amount and frequency (feeType cannot be changed)
            // URL encode the feeStructureId to handle special characters like #
            const response = await fetch(`${API_URL}/admin/fee-structure/${encodeURIComponent(selectedStructure.feeStructureId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: formData.amount,
                    frequency: formData.frequency
                })
            });

            const data = await response.json();

            if (data.success) {
                await fetchFeeStructures();
                setEditMode(false);
                setSelectedStructure(null);
                onSuccess();
            } else {
                setError(data.message || 'Failed to update fee structure');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error updating fee structure:', err);
        } finally {
            setLoading(false);
        }
    };

    const getFeeTypeName = (feeType) => {
        const names = {
            'ADMISSION_FEE': 'Admission Fee',
            'MONTHLY_FEE': 'Monthly Tuition Fee',
            'ANNUAL_FEE': 'Annual Fee',
            'EXAM_FEE': 'Exam Fee',
            'TRANSPORT_FEE': 'Transport Fee',
            'MISC': 'Miscellaneous'
        };
        return names[feeType] || feeType;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Fee Structure</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    {loading && !editMode ? (
                        <div className="loading">Loading fee structures...</div>
                    ) : editMode ? (
                        <form onSubmit={handleSubmit} className="form">
                            <div className="form-group">
                                <label>Fee Type *</label>
                                <select
                                    name="feeType"
                                    value={formData.feeType}
                                    onChange={handleChange}
                                    disabled
                                    required
                                    style={{backgroundColor: '#f3f4f6', cursor: 'not-allowed'}}
                                >
                                    <option value="ADMISSION_FEE">Admission Fee</option>
                                    <option value="MONTHLY_FEE">Monthly Tuition Fee</option>
                                    <option value="ANNUAL_FEE">Annual Fee</option>
                                    <option value="EXAM_FEE">Exam Fee</option>
                                    <option value="TRANSPORT_FEE">Transport Fee</option>
                                    <option value="MISC">Miscellaneous</option>
                                </select>
                                <small style={{color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block'}}>
                                    Fee type cannot be changed. To change fee type, delete this and create a new one.
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
                            </div>

                            <div className="form-group">
                                <label>Frequency *</label>
                                <select
                                    name="frequency"
                                    value={formData.frequency}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="ONE_TIME">One Time</option>
                                    <option value="MONTHLY">Monthly</option>
                                </select>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditMode(false);
                                        setSelectedStructure(null);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Updating...' : 'Update Fee Structure'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="fee-structures-list">
                            {feeStructures.length === 0 ? (
                                <div className="empty-state">
                                    <p>No fee structures found. Add one first.</p>
                                </div>
                            ) : (
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Fee Type</th>
                                            <th>Amount</th>
                                            <th>Frequency</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {feeStructures.map((structure) => (
                                            <tr key={structure.feeStructureId}>
                                                <td>
                                                    <strong>{getFeeTypeName(structure.feeType)}</strong>
                                                </td>
                                                <td>₹{parseFloat(structure.amount).toFixed(2)}</td>
                                                <td>
                                                    <span className={`status-badge ${structure.frequency === 'ONE_TIME' ? 'active' : 'pending'}`}>
                                                        {structure.frequency === 'ONE_TIME' ? 'One Time' : 'Monthly'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleEdit(structure)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
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

export default EditFeeStructureModal;
