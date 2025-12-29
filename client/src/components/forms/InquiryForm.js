import React, { useState } from 'react';
import './Forms.css';

function InquiryForm({ onClose }) {
    const [formData, setFormData] = useState({
        parentName: '',
        email: '',
        phone: '',
        studentName: '',
        studentAge: '',
        inquiry: '',
        preferredClass: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('http://localhost:5001/api/public/inquiry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ 
                    type: 'success', 
                    text: 'Thank you for your interest! We will contact you soon.' 
                });
                // Reset form
                setTimeout(() => {
                    setFormData({
                        parentName: '',
                        email: '',
                        phone: '',
                        studentName: '',
                        studentAge: '',
                        inquiry: '',
                        preferredClass: ''
                    });
                    setTimeout(onClose, 1500);
                }, 1500);
            } else {
                setMessage({ 
                    type: 'error', 
                    text: data.message || 'Failed to submit inquiry. Please try again.' 
                });
            }
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            setMessage({ 
                type: 'error', 
                text: 'Failed to submit inquiry. Please try again.' 
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content inquiry-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Admission Inquiry</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Parent/Guardian Name *</label>
                            <input
                                type="text"
                                name="parentName"
                                value={formData.parentName}
                                onChange={handleChange}
                                required
                                placeholder="Enter your name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Email *</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="your.email@example.com"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="+91 1234567890"
                            />
                        </div>

                        <div className="form-group">
                            <label>Student Name *</label>
                            <input
                                type="text"
                                name="studentName"
                                value={formData.studentName}
                                onChange={handleChange}
                                required
                                placeholder="Child's name"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Student Age *</label>
                            <input
                                type="number"
                                name="studentAge"
                                value={formData.studentAge}
                                onChange={handleChange}
                                required
                                min="1"
                                max="10"
                                placeholder="Age in years"
                            />
                        </div>

                        <div className="form-group">
                            <label>Preferred Class</label>
                            <select
                                name="preferredClass"
                                value={formData.preferredClass}
                                onChange={handleChange}
                            >
                                <option value="">Select a class</option>
                                <option value="PRE-NURSERY">Pre-Nursery</option>
                                <option value="NURSERY">Nursery</option>
                                <option value="LKG">LKG (Lower Kindergarten)</option>
                                <option value="UKG">UKG (Upper Kindergarten)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Your Inquiry/Message *</label>
                        <textarea
                            name="inquiry"
                            value={formData.inquiry}
                            onChange={handleChange}
                            required
                            rows="4"
                            placeholder="Tell us about your inquiry, questions, or any specific requirements..."
                        ></textarea>
                    </div>

                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit Inquiry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InquiryForm;
