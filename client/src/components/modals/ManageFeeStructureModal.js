import React, { useState, useEffect } from 'react';
import './Modals.css';

function ManageFeeStructureModal({ onClose, onSuccess }) {
    const [feeStructures, setFeeStructures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingStructure, setEditingStructure] = useState(null);
    const [formData, setFormData] = useState({
        feeType: 'ADMISSION_FEE',
        amount: '',
        frequency: 'ONE_TIME'
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

    const handleAddNew = () => {
        setEditingStructure(null);
        setFormData({
            feeType: 'ADMISSION_FEE',
            amount: '',
            frequency: 'ONE_TIME'
        });
        setShowForm(true);
    };

    const handleEdit = (structure) => {
        setEditingStructure(structure);
        setFormData({
            feeType: structure.feeType,
            amount: structure.amount,
            frequency: structure.frequency
        });
        setShowForm(true);
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

            let response;
            if (editingStructure) {
                // Update existing fee structure (only amount and frequency)
                response = await fetch(`${API_URL}/admin/fee-structure/${encodeURIComponent(editingStructure.feeStructureId)}`, {
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
            } else {
                // Create new fee structure
                response = await fetch(`${API_URL}/admin/fee-structure`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });
            }

            const data = await response.json();

            if (data.success) {
                await fetchFeeStructures();
                setShowForm(false);
                setEditingStructure(null);
                onSuccess();
            } else {
                setError(data.message || 'Failed to save fee structure');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error saving fee structure:', err);
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
                    <h2>Manage Fee Structure</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    {loading && !showForm ? (
                        <div className="loading">Loading fee structures...</div>
                    ) : showForm ? (
                        <form onSubmit={handleSubmit} className="form">
                            <h3 style={{marginBottom: '20px'}}>{editingStructure ? 'Edit Fee Structure' : 'Add New Fee Structure'}</h3>

                            <div className="form-group">
                                <label>Fee Type *</label>
                                <select
                                    name="feeType"
                                    value={formData.feeType}
                                    onChange={handleChange}
                                    disabled={editingStructure !== null}
                                    required
                                    style={editingStructure ? {backgroundColor: '#f3f4f6', cursor: 'not-allowed'} : {}}
                                >
                                    <option value="ADMISSION_FEE">Admission Fee</option>
                                    <option value="MONTHLY_FEE">Monthly Tuition Fee</option>
                                    <option value="ANNUAL_FEE">Annual Fee</option>
                                    <option value="EXAM_FEE">Exam Fee</option>
                                    <option value="TRANSPORT_FEE">Transport Fee</option>
                                    <option value="MISC">Miscellaneous</option>
                                </select>
                                {editingStructure && (
                                    <small style={{color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block'}}>
                                        Fee type cannot be changed when editing
                                    </small>
                                )}
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
                                        setShowForm(false);
                                        setEditingStructure(null);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Saving...' : editingStructure ? 'Update Fee Structure' : 'Add Fee Structure'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="fee-structures-list">
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                <p style={{margin: 0, color: '#6b7280'}}>
                                    {feeStructures.length} fee structure{feeStructures.length !== 1 ? 's' : ''} configured
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddNew}
                                >
                                    + Add New Fee Structure
                                </button>
                            </div>

                            {feeStructures.length === 0 ? (
                                <div className="empty-state">
                                    <p>No fee structures found.</p>
                                    <p style={{fontSize: '0.9rem', color: '#6b7280'}}>Click "Add New Fee Structure" to create one.</p>
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

export default ManageFeeStructureModal;
