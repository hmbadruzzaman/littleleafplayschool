import React, { useState } from 'react';
import './Forms.css';

function AddStudentForm({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        fullName: '',
        dateOfBirth: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        address: '',
        admissionDate: '',
        class: 'Play',
        password: 'password123',
        status: 'ACTIVE',
        transportEnabled: false,
        transportStartMonth: '',
        excludeAdmissionFee: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [generatedRollNumber, setGeneratedRollNumber] = useState('');

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

            const response = await fetch(`${API_URL}/admin/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                const rollNumber = data.data.rollNumber;
                setGeneratedRollNumber(rollNumber);
                setShowSuccess(true);
            } else {
                setError(data.message || 'Failed to create student');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error('Error creating student:', err);
        } finally {
            setLoading(false);
        }
    };

    // Handle success modal close
    const handleSuccessClose = () => {
        setShowSuccess(false);
        onSuccess();
        onClose();
    };

    // Show success modal if student was created
    if (showSuccess) {
        return (
            <div className="modal-overlay" onClick={handleSuccessClose}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'center' }}>
                    <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                        <button className="close-btn" onClick={handleSuccessClose}>&times;</button>
                    </div>

                    <div style={{ padding: '20px 30px 30px' }}>
                        <div style={{ fontSize: '48px', color: '#10b981', marginBottom: '20px' }}>✓</div>
                        <h2 style={{ color: '#10b981', marginBottom: '15px' }}>Student Created Successfully!</h2>

                        <div style={{
                            backgroundColor: '#f0fdf4',
                            border: '2px solid #10b981',
                            borderRadius: '8px',
                            padding: '20px',
                            marginBottom: '20px'
                        }}>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Generated Roll Number</p>
                            <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669', letterSpacing: '2px' }}>
                                {generatedRollNumber}
                            </p>
                        </div>

                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '25px' }}>
                            Please save this roll number for future reference. The student can use this roll number to login.
                        </p>

                        <button onClick={handleSuccessClose} className="btn btn-primary" style={{ minWidth: '150px' }}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Student</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

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
                            <label>Admission Date *</label>
                            <input
                                type="date"
                                name="admissionDate"
                                value={formData.admissionDate}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

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
                        <label>Parent Email</label>
                        <input
                            type="email"
                            name="parentEmail"
                            value={formData.parentEmail}
                            onChange={handleChange}
                            placeholder="parent@email.com (optional)"
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

                    <div className="form-row">
                        <div className="form-group">
                            <label>Password *</label>
                            <input
                                type="text"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Login password for student"
                                required
                            />
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
                            Check this box if the student will use school transport
                        </small>
                    </div>

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

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddStudentForm;
