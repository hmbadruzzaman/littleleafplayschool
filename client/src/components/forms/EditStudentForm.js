import React, { useState } from 'react';
import './Forms.css';

function EditStudentForm({ student, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        fullName: student.fullName || '',
        dateOfBirth: student.dateOfBirth || '',
        parentName: student.parentName || '',
        parentPhone: student.parentPhone || '',
        parentEmail: student.parentEmail || '',
        address: student.address || '',
        class: student.class || 'Play',
        status: student.status || 'ACTIVE',
        inactiveDate: student.inactiveDate || '',
        password: '',
        transportEnabled: student.transportEnabled || false,
        transportStartMonth: student.transportStartMonth || '',
        excludeAdmissionFee: student.excludeAdmissionFee || false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
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

            console.log('Submitting update for student:', student.studentId);
            const encodedStudentId = encodeURIComponent(student.studentId);
            console.log('Encoded studentId:', encodedStudentId);

            const response = await fetch(`${API_URL}/admin/students/${encodedStudentId}`, {
                method: 'PUT',
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
                setError(data.message || 'Failed to update student');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error updating student:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Edit Student Details</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Roll Number</label>
                        <input
                            type="text"
                            value={student.rollNumber}
                            disabled
                            style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                        />
                        <small style={{color: '#6b7280', fontSize: '0.85rem'}}>Roll number cannot be changed</small>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Name *</label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                placeholder="Student's full name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Date of Birth *</label>
                            <input
                                type="date"
                                name="dateOfBirth"
                                value={formData.dateOfBirth}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Class *</label>
                            <select
                                name="class"
                                value={formData.class}
                                onChange={handleChange}
                                required
                            >
                                <option value="Play">Play</option>
                                <option value="Nursery">Nursery</option>
                                <option value="LKG">LKG</option>
                                <option value="UKG">UKG</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {formData.status === 'INACTIVE' && (
                        <div className="form-group">
                            <label>Inactive Since Date *</label>
                            <input
                                type="date"
                                name="inactiveDate"
                                value={formData.inactiveDate}
                                onChange={handleChange}
                                required
                            />
                            <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                                Date from which the student became inactive
                            </small>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Parent Name *</label>
                            <input
                                type="text"
                                name="parentName"
                                value={formData.parentName}
                                onChange={handleChange}
                                placeholder="Parent/Guardian name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Parent Phone *</label>
                            <input
                                type="tel"
                                name="parentPhone"
                                value={formData.parentPhone}
                                onChange={handleChange}
                                placeholder="+91-9876543210"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Parent Email </label>
                        <input
                            type="email"
                            name="parentEmail"
                            value={formData.parentEmail}
                            onChange={handleChange}
                            placeholder="parent@email.com"
                        />
                    </div>

                    <div className="form-group">
                        <label>Address *</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="Complete address"
                            rows="3"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Change Password</label>
                        <input
                            type="text"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Leave empty to keep current password"
                        />
                        <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                            Only fill this if you want to change the student's login password
                        </small>
                    </div>

                    <div className="form-group">
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                            <input
                                type="checkbox"
                                id="transportEnabled"
                                name="transportEnabled"
                                checked={formData.transportEnabled}
                                onChange={handleChange}
                                style={{width: 'auto', margin: 0}}
                            />
                            <label htmlFor="transportEnabled" style={{margin: 0, fontWeight: '500'}}>
                                Enable Transport
                            </label>
                        </div>
                        <small style={{color: '#6b7280', fontSize: '0.85rem', display: 'block', marginBottom: '10px'}}>
                            Check this box if the student uses school transport
                        </small>
                    </div>

                    {formData.transportEnabled && (
                        <div className="form-group">
                            <label>Transport Start Month *</label>
                            <input
                                type="month"
                                name="transportStartMonth"
                                value={formData.transportStartMonth}
                                onChange={handleChange}
                                required
                            />
                            <small style={{color: '#6b7280', fontSize: '0.85rem'}}>
                                Select the month from which transport fees should be calculated
                            </small>
                        </div>
                    )}

                    <div className="form-group">
                        <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                            <input
                                type="checkbox"
                                id="excludeAdmissionFee"
                                name="excludeAdmissionFee"
                                checked={formData.excludeAdmissionFee}
                                onChange={handleChange}
                                style={{width: 'auto', margin: 0}}
                            />
                            <label htmlFor="excludeAdmissionFee" style={{margin: 0, fontWeight: '500'}}>
                                Exclude Admission Fee in Pending
                            </label>
                        </div>
                        <small style={{color: '#6b7280', fontSize: '0.85rem', display: 'block', marginBottom: '10px'}}>
                            Check this box to exclude admission fee from pending fee calculations (e.g., if admission fee was already paid)
                        </small>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditStudentForm;
