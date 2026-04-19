import React, { useState, useEffect } from 'react';
import './Modals.css';

const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5001/api'
    : 'https://welittleleaf.com/api';

const EXPENSE_TYPES = [
    { value: 'SALARY',           label: 'Salary'            },
    { value: 'INFRASTRUCTURE',   label: 'Infrastructure'    },
    { value: 'UTILITIES',        label: 'Utilities'         },
    { value: 'SUPPLIES',         label: 'Supplies'          },
    { value: 'MAINTENANCE',      label: 'Maintenance'       },
    { value: 'CAB_DRIVER_SALARY',label: "Cab Driver's Salary" },
    { value: 'PETROL',           label: 'Petrol'            },
    { value: 'MISC',             label: 'Miscellaneous'     },
];

const TYPE_COLORS = {
    SALARY:           '#4a5d3f',
    INFRASTRUCTURE:   '#7a6b4a',
    UTILITIES:        '#c97b5b',
    SUPPLIES:         '#5a7a6a',
    MAINTENANCE:      '#b85b4a',
    CAB_DRIVER_SALARY:'#6a7a8a',
    PETROL:           '#8a7a5a',
    MISC:             '#9a9a8a',
};

function ManageExpendituresModal({ onClose, inline = false }) {
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');
    const [showAddForm, setShowAddForm]   = useState(false);
    const [editingExpenditure, setEditing]= useState(null);
    const [filterType, setFilterType]     = useState('ALL');
    const [filterMonth, setFilterMonth]   = useState('');

    const [formData, setFormData] = useState({
        expenseType: 'SALARY',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        comment: ''
    });

    useEffect(() => { fetchExpenditures(); }, []);

    const fetchExpenditures = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/admin/expenditures`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setExpenditures(data.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
            } else {
                setError(data.message || 'Failed to fetch expenditures');
            }
        } catch (err) {
            console.error('Error fetching expenditures:', err);
            setError('Failed to fetch expenditures');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = e => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const resetForm = () => {
        setFormData({ expenseType: 'SALARY', amount: '', date: new Date().toISOString().split('T')[0], comment: '' });
        setShowAddForm(false);
        setEditing(null);
        setError('');
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        try {
            const token = localStorage.getItem('token');
            const url    = editingExpenditure
                ? `${API_URL}/admin/expenditures/${editingExpenditure.expenditureId}`
                : `${API_URL}/admin/expenditures`;
            const res = await fetch(url, {
                method: editingExpenditure ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) { await fetchExpenditures(); resetForm(); }
            else setError(data.message || 'Failed to save expenditure');
        } catch (err) {
            console.error('Error saving expenditure:', err);
            setError('Failed to save expenditure');
        }
    };

    const handleEdit = exp => {
        setFormData({ expenseType: exp.expenseType, amount: exp.amount.toString(), date: exp.date, comment: exp.comment || '' });
        setEditing(exp);
        setShowAddForm(true);
    };

    const handleDelete = async id => {
        if (!window.confirm('Delete this expenditure?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/admin/expenditures/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) await fetchExpenditures();
            else setError(data.message || 'Failed to delete expenditure');
        } catch (err) {
            console.error('Error deleting expenditure:', err);
            setError('Failed to delete expenditure');
        }
    };

    const getLabel = type => EXPENSE_TYPES.find(t => t.value === type)?.label || type;

    const filtered = expenditures
        .filter(e => filterType === 'ALL' || e.expenseType === filterType)
        .filter(e => {
            if (!filterMonth) return true;
            const d = new Date(e.date), f = new Date(filterMonth);
            return d.getMonth() === f.getMonth() && d.getFullYear() === f.getFullYear();
        });

    const total = filtered.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

    const formatDate = d => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

    /* ── Shared input style ────── */
    const inp = { width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 13, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', boxSizing: 'border-box' };

    const body = (
        <div onClick={e => e.stopPropagation()}>

            {!inline && (
                <div className="ll-modal__header">
                    <h2>Manage Expenditures</h2>
                    <button className="ll-modal__close" onClick={onClose}>×</button>
                </div>
            )}

            {error && <div className="error-message" style={{ margin: '0 24px 0' }}>{error}</div>}

            {/* ── Add / Edit form ─────────────────── */}
            {showAddForm && (
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>
                            {editingExpenditure ? 'Edit Expenditure' : 'Add Expenditure'}
                        </h3>
                        <button onClick={resetForm} className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }}>Cancel</button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expense Type *</label>
                                <select name="expenseType" value={formData.expenseType} onChange={handleChange} required style={inp}>
                                    {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Amount (₹) *</label>
                                <input type="number" name="amount" value={formData.amount} onChange={handleChange} placeholder="0" min="0" step="0.01" required style={inp} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Date *</label>
                                <input type="date" name="date" value={formData.date} onChange={handleChange} required style={inp} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Comment</label>
                                <textarea name="comment" value={formData.comment} onChange={handleChange} placeholder="Add details…" rows={2} style={{ ...inp, resize: 'vertical' }} />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ fontSize: 13 }}>
                            {editingExpenditure ? 'Update Expenditure' : 'Add Expenditure'}
                        </button>
                    </form>
                </div>
            )}

            {/* ── List header + filters ────────────── */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream-50)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 400, color: 'var(--forest-900)', margin: 0 }}>Expenditure List</h3>
                    {!showAddForm && (
                        <button onClick={() => { resetForm(); setShowAddForm(true); }} className="btn btn-primary" style={{ fontSize: 13 }}>
                            + Add Expenditure
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5 }}>Filter by Type</label>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inp}>
                            <option value="ALL">All Types</option>
                            {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 160 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 5 }}>Filter by Month</label>
                        <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={inp} />
                    </div>
                    <button onClick={() => { setFilterType('ALL'); setFilterMonth(''); }} className="btn btn-ghost" style={{ fontSize: 13, padding: '10px 16px' }}>
                        Clear Filters
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '8px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border-soft)', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Showing {filtered.length} of {expenditures.length} expenditures</span>
                    <span style={{ fontWeight: 600, color: 'var(--forest-900)' }}>Total: ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* ── Expenditure rows ─────────────────── */}
            <div style={{ padding: '16px 24px', maxHeight: inline ? 'none' : '50vh', overflowY: 'auto' }}>
                {loading ? (
                    <div className="loading">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                        {expenditures.length === 0 ? 'No expenditures yet. Add the first one.' : 'No entries match the current filters.'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filtered.map(exp => {
                            const color = TYPE_COLORS[exp.expenseType] || '#9a9a8a';
                            return (
                                <div key={exp.expenditureId} style={{
                                    display: 'flex', alignItems: 'center', gap: 16,
                                    padding: '14px 18px', background: 'var(--surface)',
                                    border: '1px solid var(--border-soft)', borderRadius: 10,
                                    transition: 'background 0.15s',
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--cream-50)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
                                >
                                    {/* Accent bar */}
                                    <div style={{ width: 4, height: 44, background: color, borderRadius: 2, flexShrink: 0 }} />

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}18`, padding: '2px 8px', borderRadius: 999, letterSpacing: '0.04em' }}>
                                                {getLabel(exp.expenseType)}
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(exp.date)}</span>
                                        </div>
                                        {exp.comment && (
                                            <div style={{ fontSize: 13, color: 'var(--text-light)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.comment}</div>
                                        )}
                                    </div>

                                    {/* Amount */}
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--forest-900)', flexShrink: 0, marginRight: 8 }}>
                                        ₹{parseFloat(exp.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                        <button onClick={e => { e.stopPropagation(); handleEdit(exp); }}
                                            className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
                                            Edit
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); handleDelete(exp.expenditureId); }}
                                            style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--error-color)', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--error-bg)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    if (inline) return body;

    return (
        <div className="ll-modal-overlay" onClick={onClose}>
            <div className="ll-modal" style={{ maxWidth: 860 }} onClick={e => e.stopPropagation()}>
                {body}
            </div>
        </div>
    );
}

export default ManageExpendituresModal;
