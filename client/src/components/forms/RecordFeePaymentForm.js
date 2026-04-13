import React, { useState, useEffect } from 'react';
import './Forms.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
    `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
    `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
    `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`
];
const NEEDS_MONTH = ['MONTHLY_FEE', 'TRANSPORT_FEE'];

function emptyRow() {
    return {
        feeType: 'MONTHLY_FEE',
        amount: '',
        months: [],
        academicYear: YEAR_OPTIONS[1],
        dueDate: '',
        paymentStatus: 'PAID',
        paymentMethod: 'CASH',
        transactionId: '',
        remarks: ''
    };
}

function RecordFeePaymentForm({ onClose, onSuccess, preselectedStudent = null }) {
    const [students, setStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState(preselectedStudent?.studentId || '');
    const [selectedRollNumber, setSelectedRollNumber] = useState(preselectedStudent?.rollNumber || '');
    const [feeRows, setFeeRows] = useState([emptyRow()]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [results, setResults] = useState(null);

    const API_URL = window.location.hostname === 'localhost'
        ? 'http://localhost:5001/api'
        : 'https://welittleleaf.com/api';

    useEffect(() => {
        if (!preselectedStudent) fetchStudents();
    }, [preselectedStudent]);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/admin/students`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setStudents(data.data);
        } catch (err) {
            console.error('Error fetching students:', err);
        }
    };

    const handleStudentSelect = (e) => {
        const s = students.find(s => s.studentId === e.target.value);
        if (s) { setSelectedStudentId(s.studentId); setSelectedRollNumber(s.rollNumber); }
    };

    const updateRow = (index, field, value) => {
        setFeeRows(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
    };

    const toggleMonth = (index, month) => {
        setFeeRows(rows => rows.map((row, i) => {
            if (i !== index) return row;
            const months = row.months.includes(month)
                ? row.months.filter(m => m !== month)
                : [...row.months, month];
            return { ...row, months };
        }));
    };

    const addRow = () => {
        if (feeRows.length < 6) setFeeRows(rows => [...rows, emptyRow()]);
    };

    const removeRow = (index) => {
        if (feeRows.length > 1) setFeeRows(rows => rows.filter((_, i) => i !== index));
    };

    const calcTotal = () => feeRows.reduce((total, row) => {
        const amount = parseFloat(row.amount) || 0;
        const count = NEEDS_MONTH.includes(row.feeType) ? (row.months.length || 1) : 1;
        return total + amount * count;
    }, 0);

    const validateRows = () => {
        if (!selectedStudentId) return 'Please select a student';
        for (let i = 0; i < feeRows.length; i++) {
            const row = feeRows[i];
            if (!row.amount || parseFloat(row.amount) <= 0) return `Row ${i + 1}: Valid amount is required`;
            if (NEEDS_MONTH.includes(row.feeType) && row.months.length === 0) return `Row ${i + 1}: Select at least one month`;
            if (!row.dueDate) return `Row ${i + 1}: Due date is required`;
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validateRows();
        if (validationError) { setError(validationError); return; }

        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');

        const records = [];
        for (const row of feeRows) {
            const monthList = NEEDS_MONTH.includes(row.feeType) ? row.months : [null];
            for (const month of monthList) {
                records.push({
                    studentId: selectedStudentId,
                    rollNumber: selectedRollNumber,
                    feeType: row.feeType,
                    amount: parseFloat(row.amount),
                    month: month || '',
                    academicYear: row.academicYear,
                    dueDate: row.dueDate,
                    paymentStatus: row.paymentStatus,
                    paymentMethod: row.paymentStatus === 'PAID' ? row.paymentMethod : undefined,
                    transactionId: row.transactionId || undefined,
                    remarks: row.remarks || undefined,
                    paymentDate: row.paymentStatus === 'PAID' ? new Date().toISOString().split('T')[0] : null
                });
            }
        }

        let succeeded = 0;
        let failed = 0;
        for (const record of records) {
            try {
                const res = await fetch(`${API_URL}/admin/fees`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(record)
                });
                const data = await res.json();
                if (data.success) succeeded++;
                else failed++;
            } catch {
                failed++;
            }
        }

        setLoading(false);
        setResults({ succeeded, failed, total: records.length });
        if (failed === 0) {
            if (onSuccess) onSuccess();
            onClose();
        }
    };

    if (results && results.failed > 0) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Partial Success</h2>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>
                    <div className="modal-body">
                        <p style={{ color: '#16a34a', marginBottom: '8px' }}>✓ {results.succeeded} of {results.total} records saved successfully.</p>
                        <p style={{ color: '#dc2626' }}>✗ {results.failed} records failed. Please record them again.</p>
                    </div>
                    <div className="form-footer">
                        <button onClick={() => { if (onSuccess) onSuccess(); onClose(); }} className="btn btn-secondary">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Record Fee Payment</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="form">
                    {error && <div className="error-message">{error}</div>}

                    {preselectedStudent ? (
                        <div className="form-group">
                            <label>Student</label>
                            <input type="text"
                                value={`${preselectedStudent.rollNumber} - ${preselectedStudent.fullName}`}
                                disabled style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }} />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Select Student *</label>
                            <select value={selectedStudentId} onChange={handleStudentSelect} required>
                                <option value="">-- Select Student --</option>
                                {students.filter(s => s.status === 'ACTIVE').map(s => (
                                    <option key={s.studentId} value={s.studentId}>
                                        {s.rollNumber} - {s.fullName} ({s.class})
                                    </option>
                                ))}
                                {students.some(s => s.status === 'INACTIVE') && (
                                    <>
                                        <option disabled>── Inactive Students (pending dues) ──</option>
                                        {students.filter(s => s.status === 'INACTIVE').map(s => (
                                            <option key={s.studentId} value={s.studentId}>
                                                {s.rollNumber} - {s.fullName} (INACTIVE)
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    )}

                    {feeRows.map((row, index) => (
                        <div key={index} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', marginBottom: '12px', position: 'relative' }}>
                            {feeRows.length > 1 && (
                                <button type="button" onClick={() => removeRow(index)}
                                    style={{ position: 'absolute', top: '8px', right: '8px', background: '#fee2e2', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', color: '#dc2626', fontWeight: '700' }}>
                                    ×
                                </button>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Fee Type *</label>
                                    <select value={row.feeType} onChange={e => updateRow(index, 'feeType', e.target.value)} required>
                                        <option value="ADMISSION_FEE">Admission Fee</option>
                                        <option value="MONTHLY_FEE">Monthly Tuition Fee</option>
                                        <option value="ANNUAL_FEE">Annual Fee</option>
                                        <option value="EXAM_FEE">Exam Fee</option>
                                        <option value="TRANSPORT_FEE">Transport Fee</option>
                                        <option value="MISC">Miscellaneous</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Amount per {NEEDS_MONTH.includes(row.feeType) ? 'month' : 'entry'} (₹) *</label>
                                    <input type="number" value={row.amount}
                                        onChange={e => updateRow(index, 'amount', e.target.value)}
                                        placeholder="e.g., 3000" min="0" step="0.01" required />
                                </div>
                            </div>

                            {NEEDS_MONTH.includes(row.feeType) && (
                                <div className="form-group">
                                    <label>Select Months * <span style={{ color: '#6b7280', fontSize: '0.8rem' }}>(select all months being paid)</span></label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                                        {MONTHS.map(month => (
                                            <label key={month} style={{
                                                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                                padding: '4px 10px', borderRadius: '20px', userSelect: 'none',
                                                border: `1px solid ${row.months.includes(month) ? '#16a34a' : '#d1d5db'}`,
                                                background: row.months.includes(month) ? '#f0fdf4' : 'white',
                                                fontSize: '0.85rem', color: row.months.includes(month) ? '#16a34a' : '#374151'
                                            }}>
                                                <input type="checkbox" checked={row.months.includes(month)}
                                                    onChange={() => toggleMonth(index, month)} style={{ display: 'none' }} />
                                                {row.months.includes(month) ? '✓ ' : ''}{month}
                                            </label>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>Academic Year *</label>
                                        <select value={row.academicYear} onChange={e => updateRow(index, 'academicYear', e.target.value)} required>
                                            {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Due Date *</label>
                                    <input type="date" value={row.dueDate} onChange={e => updateRow(index, 'dueDate', e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label>Payment Status *</label>
                                    <select value={row.paymentStatus} onChange={e => updateRow(index, 'paymentStatus', e.target.value)} required>
                                        <option value="PAID">Paid</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="OVERDUE">Overdue</option>
                                    </select>
                                </div>
                            </div>

                            {row.paymentStatus === 'PAID' && (
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Payment Method *</label>
                                        <select value={row.paymentMethod} onChange={e => updateRow(index, 'paymentMethod', e.target.value)} required>
                                            <option value="CASH">Cash</option>
                                            <option value="CARD">Card</option>
                                            <option value="UPI">UPI</option>
                                            <option value="NET_BANKING">Net Banking</option>
                                            <option value="CHEQUE">Cheque</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Transaction ID</label>
                                        <input type="text" value={row.transactionId}
                                            onChange={e => updateRow(index, 'transactionId', e.target.value)}
                                            placeholder="Optional" />
                                    </div>
                                </div>
                            )}

                            <div className="form-group">
                                <label>Remarks</label>
                                <textarea value={row.remarks} onChange={e => updateRow(index, 'remarks', e.target.value)}
                                    rows="2" placeholder="Optional notes" />
                            </div>
                        </div>
                    ))}

                    {feeRows.length < 6 && (
                        <button type="button" onClick={addRow} className="btn btn-secondary"
                            style={{ marginBottom: '16px', width: '100%' }}>
                            + Add Another Fee
                        </button>
                    )}

                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#166534' }}>Total Amount</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#15803d' }}>
                            ₹{calcTotal().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving...' : 'Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default RecordFeePaymentForm;
