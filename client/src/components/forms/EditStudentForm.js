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
        class: student.class || 'Pre-KG A',
        status: student.status || 'ACTIVE',
        inactiveDate: student.inactiveDate || ''
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
            const response = await fetch(`http://localhost:5001/api/admin/students/${student.studentId}`, {
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
                                <option value="Pre-KG A">Pre-KG A</option>
                                <option value="Pre-KG B">Pre-KG B</option>
                                <option value="LKG A">LKG A</option>
                                <option value="LKG B">LKG B</option>
                                <option value="UKG A">UKG A</option>
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
                        <label>Parent Email *</label>
                        <input
                            type="email"
                            name="parentEmail"
                            value={formData.parentEmail}
                            onChange={handleChange}
                            placeholder="parent@email.com"
                            required
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
