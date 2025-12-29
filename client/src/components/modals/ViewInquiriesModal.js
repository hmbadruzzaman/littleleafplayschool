import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './Modals.css';

function ViewInquiriesModal({ onClose }) {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, NEW, FOLLOWED_UP
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchInquiries();
    }, []);

    const fetchInquiries = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getAllInquiries();
            setInquiries(response.data.data || []);
        } catch (error) {
            console.error('Error fetching inquiries:', error);
            setMessage({ type: 'error', text: 'Failed to load inquiries' });
        } finally {
            setLoading(false);
        }
    };

    const handleFollowUp = async (inquiryId) => {
        try {
            await adminAPI.updateInquiryStatus(inquiryId, 'FOLLOWED_UP');
            setMessage({ type: 'success', text: 'Inquiry marked as followed up' });

            // Update local state
            setInquiries(inquiries.map(inq =>
                inq.inquiryId === inquiryId
                    ? { ...inq, status: 'FOLLOWED_UP', followedUpAt: new Date().toISOString() }
                    : inq
            ));

            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error updating inquiry:', error);
            setMessage({ type: 'error', text: 'Failed to update inquiry status' });
        }
    };

    const getFilteredInquiries = () => {
        if (filter === 'ALL') return inquiries;
        return inquiries.filter(inq => inq.status === filter);
    };

    const filteredInquiries = getFilteredInquiries();
    const newCount = inquiries.filter(inq => inq.status === 'NEW').length;
    const followedUpCount = inquiries.filter(inq => inq.status === 'FOLLOWED_UP').length;

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Admission Inquiries</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body">
                    {/* Filter Tabs */}
                    <div className="filter-tabs">
                        <button
                            className={filter === 'ALL' ? 'active' : ''}
                            onClick={() => setFilter('ALL')}
                        >
                            All ({inquiries.length})
                        </button>
                        <button
                            className={filter === 'NEW' ? 'active' : ''}
                            onClick={() => setFilter('NEW')}
                        >
                            Pending ({newCount})
                        </button>
                        <button
                            className={filter === 'FOLLOWED_UP' ? 'active' : ''}
                            onClick={() => setFilter('FOLLOWED_UP')}
                        >
                            Followed Up ({followedUpCount})
                        </button>
                    </div>

                    {message.text && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {loading ? (
                        <div className="loading">Loading inquiries...</div>
                    ) : filteredInquiries.length === 0 ? (
                        <div className="empty-state">
                            <p>No inquiries found</p>
                        </div>
                    ) : (
                        <div className="inquiries-list">
                            {filteredInquiries.map((inquiry) => (
                                <div key={inquiry.inquiryId} className={`inquiry-card ${inquiry.status.toLowerCase()}`}>
                                    <div className="inquiry-header">
                                        <div className="inquiry-info">
                                            <h3>{inquiry.studentName}</h3>
                                            <span className={`status-badge ${inquiry.status.toLowerCase()}`}>
                                                {inquiry.status === 'NEW' ? 'Pending' : 'Followed Up'}
                                            </span>
                                        </div>
                                        <div className="inquiry-date">
                                            {formatDate(inquiry.submittedAt)}
                                        </div>
                                    </div>

                                    <div className="inquiry-details">
                                        <div className="detail-row">
                                            <div className="detail-item">
                                                <strong>Parent/Guardian:</strong>
                                                <span>{inquiry.parentName}</span>
                                            </div>
                                            <div className="detail-item">
                                                <strong>Student Age:</strong>
                                                <span>{inquiry.studentAge} years</span>
                                            </div>
                                        </div>

                                        <div className="detail-row">
                                            <div className="detail-item">
                                                <strong>Email:</strong>
                                                <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                                            </div>
                                            <div className="detail-item">
                                                <strong>Phone:</strong>
                                                <a href={`tel:${inquiry.phone}`}>{inquiry.phone}</a>
                                            </div>
                                        </div>

                                        <div className="detail-row">
                                            <div className="detail-item">
                                                <strong>Preferred Class:</strong>
                                                <span>{inquiry.preferredClass}</span>
                                            </div>
                                        </div>

                                        <div className="detail-row full-width">
                                            <div className="detail-item">
                                                <strong>Inquiry Message:</strong>
                                                <p className="inquiry-message">{inquiry.inquiry}</p>
                                            </div>
                                        </div>

                                        {inquiry.followedUpAt && (
                                            <div className="followed-up-info">
                                                Followed up on: {formatDate(inquiry.followedUpAt)}
                                            </div>
                                        )}
                                    </div>

                                    {inquiry.status === 'NEW' && (
                                        <div className="inquiry-actions">
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleFollowUp(inquiry.inquiryId)}
                                            >
                                                Mark as Followed Up
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ViewInquiriesModal;
