import React, { useState, useEffect } from 'react';
import './Modals.css';

function ManageHolidaysModal({ onClose, onSuccess }) {
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [formData, setFormData] = useState({
        holidayName: '',
        holidayDate: '',
        holidayType: 'SCHOOL',
        description: ''
    });

    useEffect(() => {
        fetchHolidays();
    }, []);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const response = await fetch(`${API_URL}/admin/holidays`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                // Sort holidays by date (most recent first)
                const sortedHolidays = (data.data || []).sort((a, b) =>
                    new Date(b.holidayDate) - new Date(a.holidayDate)
                );
                setHolidays(sortedHolidays);
            }
        } catch (err) {
            console.error('Error fetching holidays:', err);
            setError('Failed to load holidays');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setEditingHoliday(null);
        setFormData({
            holidayName: '',
            holidayDate: '',
            holidayType: 'SCHOOL',
            description: ''
        });
        setShowForm(true);
    };

    const handleEdit = (holiday) => {
        setEditingHoliday(holiday);
        setFormData({
            holidayName: holiday.holidayName,
            holidayDate: holiday.holidayDate,
            holidayType: holiday.holidayType,
            description: holiday.description || ''
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
            if (editingHoliday) {
                // Update existing holiday
                response = await fetch(`${API_URL}/admin/holidays/${encodeURIComponent(editingHoliday.holidayId)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });
            } else {
                // Create new holiday
                response = await fetch(`${API_URL}/admin/holidays`, {
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
                await fetchHolidays();
                setShowForm(false);
                setEditingHoliday(null);
                onSuccess();
            } else {
                setError(data.message || `Failed to ${editingHoliday ? 'update' : 'add'} holiday`);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(`Error ${editingHoliday ? 'updating' : 'adding'} holiday:`, err);
        } finally {
            setLoading(false);
        }
    };

    const getHolidayTypeLabel = (type) => {
        const labels = {
            'SCHOOL': 'School Holiday',
            'NATIONAL': 'National Holiday',
            'FESTIVAL': 'Festival',
            'VACATION': 'Vacation',
            'OTHER': 'Other'
        };
        return labels[type] || type;
    };

    const getHolidayTypeBadgeClass = (type) => {
        const classes = {
            'SCHOOL': 'pending',
            'NATIONAL': 'active',
            'FESTIVAL': 'completed',
            'VACATION': 'inactive',
            'OTHER': 'default'
        };
        return classes[type] || 'default';
    };

    const formatDate = (dateString) => {
        // Parse date without timezone conversion
        const [year, month, day] = dateString.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${months[parseInt(month) - 1]}, ${year}`;
    };

    const isUpcoming = (dateString) => {
        // Compare dates without timezone conversion
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [year, month, day] = dateString.split('-');
        const holidayDate = new Date(year, month - 1, day);
        return holidayDate >= today;
    };

    const upcomingHolidays = holidays.filter(h => isUpcoming(h.holidayDate));
    const pastHolidays = holidays.filter(h => !isUpcoming(h.holidayDate));

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Manage Holidays</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {error && <div className="error-message">{error}</div>}

                    {loading && !showForm ? (
                        <div className="loading">Loading holidays...</div>
                    ) : showForm ? (
                        <form onSubmit={handleSubmit} className="form">
                            <h3 style={{marginBottom: '20px'}}>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>

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
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingHoliday(null);
                                    }}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? (editingHoliday ? 'Updating...' : 'Adding...') : (editingHoliday ? 'Update Holiday' : 'Add Holiday')}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="holidays-list">
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
                                <p style={{margin: 0, color: '#6b7280'}}>
                                    {holidays.length} holiday{holidays.length !== 1 ? 's' : ''} configured
                                    {upcomingHolidays.length > 0 && ` (${upcomingHolidays.length} upcoming)`}
                                </p>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAddNew}
                                >
                                    + Add New Holiday
                                </button>
                            </div>

                            {holidays.length === 0 ? (
                                <div className="empty-state">
                                    <p>No holidays configured.</p>
                                    <p style={{fontSize: '0.9rem', color: '#6b7280'}}>Click "Add New Holiday" to create one.</p>
                                </div>
                            ) : (
                                <>
                                    {upcomingHolidays.length > 0 && (
                                        <div style={{marginBottom: '30px'}}>
                                            <h3 style={{fontSize: '1.1rem', marginBottom: '15px', color: '#059669'}}>
                                                School Holidays ({upcomingHolidays.length})
                                            </h3>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Holiday Name</th>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th>Description</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {upcomingHolidays.map((holiday) => (
                                                        <tr key={holiday.holidayId}>
                                                            <td>
                                                                <strong>{holiday.holidayName}</strong>
                                                            </td>
                                                            <td>{formatDate(holiday.holidayDate)}</td>
                                                            <td>
                                                                <span className={`status-badge ${getHolidayTypeBadgeClass(holiday.holidayType)}`}>
                                                                    {getHolidayTypeLabel(holiday.holidayType)}
                                                                </span>
                                                            </td>
                                                            <td style={{fontSize: '0.9rem', color: '#6b7280'}}>
                                                                {holiday.description || '-'}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    onClick={() => handleEdit(holiday)}
                                                                >
                                                                    Edit
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {pastHolidays.length > 0 && (
                                        <div>
                                            <h3 style={{fontSize: '1.1rem', marginBottom: '15px', color: '#6b7280'}}>
                                                School Holidays ({pastHolidays.length})
                                            </h3>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Holiday Name</th>
                                                        <th>Date</th>
                                                        <th>Type</th>
                                                        <th>Description</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pastHolidays.map((holiday) => (
                                                        <tr key={holiday.holidayId} style={{opacity: 0.7}}>
                                                            <td>{holiday.holidayName}</td>
                                                            <td>{formatDate(holiday.holidayDate)}</td>
                                                            <td>
                                                                <span className={`status-badge ${getHolidayTypeBadgeClass(holiday.holidayType)}`}>
                                                                    {getHolidayTypeLabel(holiday.holidayType)}
                                                                </span>
                                                            </td>
                                                            <td style={{fontSize: '0.9rem', color: '#6b7280'}}>
                                                                {holiday.description || '-'}
                                                            </td>
                                                            <td>
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    onClick={() => handleEdit(holiday)}
                                                                >
                                                                    Edit
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </>
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

export default ManageHolidaysModal;
