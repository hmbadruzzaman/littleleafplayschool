import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import './Modals.css';

function ViewInquiriesModal({ onClose }) {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL'); // ALL, NEW, FOLLOWED_UP, IN_PROGRESS
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showFollowUpModal, setShowFollowUpModal] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [followUpComment, setFollowUpComment] = useState('');
    const [keepOpen, setKeepOpen] = useState(false);

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

    const openFollowUpModal = (inquiry) => {
        setSelectedInquiry(inquiry);
        setFollowUpComment('');
        setKeepOpen(false);
        setShowFollowUpModal(true);
    };

    const handleFollowUp = async () => {
        if (!selectedInquiry) return;

        try {
            const status = keepOpen ? 'IN_PROGRESS' : 'FOLLOWED_UP';
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const response = await fetch(`${API_URL}/admin/inquiries/${encodeURIComponent(selectedInquiry.inquiryId)}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status,
                    comment: followUpComment
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessage({ type: 'success', text: keepOpen ? 'Inquiry marked as in progress' : 'Inquiry marked as followed up' });

                // Update local state
                setInquiries(inquiries.map(inq =>
                    inq.inquiryId === selectedInquiry.inquiryId
                        ? {
                            ...inq,
                            status,
                            followedUpAt: new Date().toISOString(),
                            comment: followUpComment
                        }
                        : inq
                ));

                setShowFollowUpModal(false);
                setSelectedInquiry(null);
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to update inquiry status' });
            }
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
    const inProgressCount = inquiries.filter(inq => inq.status === 'IN_PROGRESS').length;
    const pendingCount = newCount + inProgressCount; // Combined count for badge
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
                            New ({newCount})
                        </button>
                        <button
                            className={filter === 'IN_PROGRESS' ? 'active' : ''}
                            onClick={() => setFilter('IN_PROGRESS')}
                        >
                            In Progress ({inProgressCount})
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
                                                {inquiry.status === 'NEW' ? 'New' : inquiry.status === 'IN_PROGRESS' ? 'In Progress' : 'Followed Up'}
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

                                        {inquiry.comment && (
                                            <div className="detail-row full-width">
                                                <div className="detail-item">
                                                    <strong>Admin Comment:</strong>
                                                    <p className="inquiry-message" style={{fontStyle: 'italic', color: '#059669'}}>{inquiry.comment}</p>
                                                </div>
                                            </div>
                                        )}

                                        {inquiry.followedUpAt && (
                                            <div className="followed-up-info">
                                                Followed up on: {formatDate(inquiry.followedUpAt)}
                                            </div>
                                        )}
                                    </div>

                                    {(inquiry.status === 'NEW' || inquiry.status === 'IN_PROGRESS') && (
                                        <div className="inquiry-actions">
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => openFollowUpModal(inquiry)}
                                            >
                                                {inquiry.status === 'IN_PROGRESS' ? 'Update Follow-up' : 'Follow Up'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Follow-up Modal */}
            {showFollowUpModal && selectedInquiry && (
                <div className="modal-overlay" onClick={() => setShowFollowUpModal(false)} style={{zIndex: 1001}}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
                        <div className="modal-header">
                            <h2>Follow Up on Inquiry</h2>
                            <button className="close-btn" onClick={() => setShowFollowUpModal(false)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div style={{marginBottom: '20px', padding: '12px', backgroundColor: '#f3f4f6', borderRadius: '6px'}}>
                                <strong>{selectedInquiry.studentName}</strong>
                                <div style={{fontSize: '0.9rem', color: '#6b7280', marginTop: '4px'}}>
                                    Parent: {selectedInquiry.parentName} | Phone: {selectedInquiry.phone}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Admin Comment</label>
                                <textarea
                                    value={followUpComment}
                                    onChange={(e) => setFollowUpComment(e.target.value)}
                                    placeholder="Add notes about this follow-up (optional)"
                                    rows="4"
                                    style={{width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db'}}
                                />
                            </div>

                            <div className="form-group">
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                    <input
                                        type="checkbox"
                                        id="keepOpen"
                                        checked={keepOpen}
                                        onChange={(e) => setKeepOpen(e.target.checked)}
                                        style={{width: 'auto', margin: 0}}
                                    />
                                    <label htmlFor="keepOpen" style={{margin: 0, fontWeight: '500'}}>
                                        Keep inquiry open (Mark as "In Progress")
                                    </label>
                                </div>
                                <small style={{color: '#6b7280', fontSize: '0.85rem', marginTop: '4px', display: 'block'}}>
                                    Check this if the inquiry requires additional follow-up
                                </small>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowFollowUpModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleFollowUp}
                                    className="btn btn-primary"
                                >
                                    {keepOpen ? 'Mark as In Progress' : 'Mark as Followed Up'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ViewInquiriesModal;
