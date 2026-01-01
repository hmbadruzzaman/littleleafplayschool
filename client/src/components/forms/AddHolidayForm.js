import React, { useState } from 'react';
import './Forms.css';

function AddHolidayForm({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        holidayName: '',
        holidayDate: '',
        holidayType: 'SCHOOL',
        description: ''
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
            const response = await fetch(`${API_URL}/admin/holidays`, {
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
                setError(data.message || 'Failed to add holiday');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error adding holiday:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Holiday</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Holiday Name *</label>
                        <input
                            type="text"
                            name="holidayName"
                            value={formData.holidayName}
                            onChange={handleChange}
                            placeholder="e.g., Independence Day"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Holiday Date *</label>
                            <input
                                type="date"
                                name="holidayDate"
                                value={formData.holidayDate}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Holiday Type *</label>
                            <select
                                name="holidayType"
                                value={formData.holidayType}
                                onChange={handleChange}
                                required
                            >
                                <option value="SCHOOL">School Holiday</option>
                                <option value="NATIONAL">National Holiday</option>
                                <option value="FESTIVAL">Festival</option>
                                <option value="VACATION">Vacation</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Optional description or notes"
                            rows="4"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Holiday'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddHolidayForm;
