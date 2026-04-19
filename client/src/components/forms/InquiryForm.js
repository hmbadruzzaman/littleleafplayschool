import React, { useState } from 'react';
import LeafMark from '../common/LeafMark';
import './Forms.css';

const API_URL = 'https://welittleleaf.com/api';

function InquiryForm({ onClose, onSuccess }) {
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

    const handleChange = e => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`${API_URL}/public/inquiry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();

            if (response.ok) {
                setMessage({ type: 'success', text: 'Thank you! We will contact you soon.' });
                if (onSuccess) onSuccess();
                setTimeout(() => {
                    setFormData({ parentName:'', email:'', phone:'', studentName:'', studentAge:'', inquiry:'', preferredClass:'' });
                    setTimeout(onClose, 1000);
                }, 1500);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to submit. Please try again.' });
            }
        } catch (error) {
            console.error('Error submitting inquiry:', error);
            setMessage({ type: 'error', text: 'Failed to submit. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ll-modal-overlay" onClick={onClose}>
            <div className="ll-modal ll-inquiry-modal" onClick={e => e.stopPropagation()}>

                <div className="ll-modal__header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="ll-modal__header-icon">
                            <LeafMark size={18} />
                        </div>
                        <h2>Admission Inquiry</h2>
                    </div>
                    <button className="ll-modal__close" onClick={onClose} aria-label="Close">×</button>
                </div>

                <form onSubmit={handleSubmit} className="ll-modal__body">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Parent / Guardian Name *</label>
                            <input type="text" name="parentName" value={formData.parentName}
                                onChange={handleChange} required placeholder="Your full name" />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email}
                                onChange={handleChange} placeholder="your@email.com" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Phone Number *</label>
                            <input type="tel" name="phone" value={formData.phone}
                                onChange={handleChange} required placeholder="+91 98300 12345" />
                        </div>
                        <div className="form-group">
                            <label>Child's Name *</label>
                            <input type="text" name="studentName" value={formData.studentName}
                                onChange={handleChange} required placeholder="Child's full name" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Child's Age *</label>
                            <input type="number" name="studentAge" value={formData.studentAge}
                                onChange={handleChange} required min="1" max="10" placeholder="Age in years" />
                        </div>
                        <div className="form-group">
                            <label>Preferred Class</label>
                            <select name="preferredClass" value={formData.preferredClass} onChange={handleChange}>
                                <option value="">Select a class</option>
                                <option value="PRE-NURSERY">Pre-Nursery</option>
                                <option value="NURSERY">Nursery</option>
                                <option value="LKG">LKG (Lower Kindergarten)</option>
                                <option value="UKG">UKG (Upper Kindergarten)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Your Message *</label>
                        <textarea name="inquiry" value={formData.inquiry} onChange={handleChange}
                            required rows="4"
                            placeholder="Tell us about your inquiry or any specific questions…" />
                    </div>

                    {message.text && (
                        <div className={`ll-modal__message ll-modal__message--${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="ll-modal__footer">
                        <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Submitting…' : 'Submit Inquiry'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InquiryForm;
