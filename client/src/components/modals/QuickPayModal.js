import React, { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../services/api';
import './Modals.css';

const PAYMENT_METHODS = ['CASH', 'CARD', 'UPI', 'NET_BANKING', 'CHEQUE'];
const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

function QuickPayModal({ student, onClose, onSuccess }) {
    const studentId = student.studentId;
    const studentName = student.fullName || student.studentName || '';
    const rollNumber = student.rollNumber || '';

    const [amount, setAmount] = useState('');
    const [preview, setPreview] = useState(null);
    const [previewing, setPreviewing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [remarks, setRemarks] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const debounce = useRef(null);

    useEffect(() => {
        if (debounce.current) clearTimeout(debounce.current);
        const value = parseFloat(amount);
        if (!value || value <= 0) { setPreview(null); return; }
        debounce.current = setTimeout(async () => {
            setPreviewing(true);
            setError('');
            try {
                const res = await adminAPI.quickPayPreview(studentId, value);
                if (res.data.success) setPreview(res.data.data);
                else setError(res.data.message || 'Could not compute allocation');
            } catch (err) {
                setError('Could not compute allocation');
            } finally {
                setPreviewing(false);
            }
        }, 400);
        return () => debounce.current && clearTimeout(debounce.current);
    }, [amount, studentId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (!value || value <= 0) { setError('Enter a valid amount'); return; }
        if (!preview || preview.allocations.length === 0) {
            setError('This amount cannot be applied — no pending dues'); return;
        }
        setSaving(true);
        setError('');
        try {
            const res = await adminAPI.quickPay(studentId, {
                amount: value, paymentMethod, paymentDate, remarks: remarks || undefined
            });
            if (res.data.success) {
                if (onSuccess) onSuccess(res.data.data);
                onClose();
            } else {
                setError(res.data.message || 'Failed to record payment');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Quick Pay</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>
                            {rollNumber}{rollNumber && studentName ? ' — ' : ''}{studentName}
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

                    <div className="form-group">
                        <label>Amount (₹) *</label>
                        <input type="number" min="0" step="0.01" value={amount} autoFocus
                            onChange={e => setAmount(e.target.value)} placeholder="e.g., 6000" required />
                    </div>

                    {previewing && (
                        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Calculating allocation…</p>
                    )}

                    {preview && (
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                This payment will be applied to:
                            </div>
                            {preview.allocations.length === 0 ? (
                                <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>No pending dues to apply this to.</p>
                            ) : (
                                <table className="fee-details-table" style={{ width: '100%' }}>
                                    <tbody>
                                        {preview.allocations.map((a, i) => (
                                            <tr key={i}>
                                                <td>{a.label}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(a.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {preview.leftover > 0 && (
                                <div style={{ marginTop: 8, fontSize: 13, color: '#b45309' }}>
                                    {fmt(preview.leftover)} left over — exceeds total pending of {fmt(preview.totalPending)}; this part will not be recorded.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label>Payment Method *</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} required>
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Payment Date *</label>
                            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Remarks</label>
                        <textarea rows="2" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Optional notes" />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary"
                            disabled={saving || !preview || preview.allocations.length === 0}>
                            {saving ? 'Recording…' : `Record ${preview ? fmt(preview.allocated) : ''}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default QuickPayModal;
