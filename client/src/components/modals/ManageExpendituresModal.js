import React, { useState, useEffect } from 'react';
import './Modals.css';

function ManageExpendituresModal({ onClose }) {
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingExpenditure, setEditingExpenditure] = useState(null);
    const [filterType, setFilterType] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState('');

    const [formData, setFormData] = useState({
        expenseType: 'SALARY',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        comment: ''
    });

    useEffect(() => {
        fetchExpenditures();
    }, []);

    const fetchExpenditures = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const response = await fetch(`${API_URL}/admin/expenditures`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                // Sort by date (newest first)
                const sortedExpenditures = data.data.sort((a, b) =>
                    new Date(b.date) - new Date(a.date)
                );
                setExpenditures(sortedExpenditures);
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            expenseType: 'SALARY',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            comment: ''
        });
        setShowAddForm(false);
        setEditingExpenditure(null);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const url = editingExpenditure
                ? `${API_URL}/admin/expenditures/${editingExpenditure.expenditureId}`
                : `${API_URL}/admin/expenditures`;

            const method = editingExpenditure ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                await fetchExpenditures();
                resetForm();
            } else {
                setError(data.message || 'Failed to save expenditure');
            }
        } catch (err) {
            console.error('Error saving expenditure:', err);
            setError('Failed to save expenditure');
        }
    };

    const handleEdit = (expenditure) => {
        setFormData({
            expenseType: expenditure.expenseType,
            amount: expenditure.amount.toString(),
            date: expenditure.date,
            comment: expenditure.comment || ''
        });
        setEditingExpenditure(expenditure);
        setShowAddForm(true);
    };

    const handleDelete = async (expenditureId) => {
        if (!window.confirm('Are you sure you want to delete this expenditure?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const API_URL = window.location.hostname === 'localhost'
                ? 'http://localhost:5001/api'
                : 'https://welittleleaf.com/api';

            const response = await fetch(`${API_URL}/admin/expenditures/${expenditureId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                await fetchExpenditures();
            } else {
                setError(data.message || 'Failed to delete expenditure');
            }
        } catch (err) {
            console.error('Error deleting expenditure:', err);
            setError('Failed to delete expenditure');
        }
    };

    const getExpenseTypeLabel = (type) => {
        const labels = {
            'SALARY': 'Salary',
            'INFRASTRUCTURE': 'Infrastructure',
            'UTILITIES': 'Utilities',
            'SUPPLIES': 'Supplies',
            'MAINTENANCE': 'Maintenance',
            'MISC': 'Miscellaneous'
        };
        return labels[type] || type;
    };

    const getExpenseTypeColor = (type) => {
        const colors = {
            'SALARY': '#10b981',
            'INFRASTRUCTURE': '#6366f1',
            'UTILITIES': '#f59e0b',
            'SUPPLIES': '#8b5cf6',
            'MAINTENANCE': '#ef4444',
            'MISC': '#6b7280'
        };
        return colors[type] || '#6b7280';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getFilteredExpenditures = () => {
        let filtered = expenditures;

        // Filter by type
        if (filterType !== 'ALL') {
            filtered = filtered.filter(exp => exp.expenseType === filterType);
        }

        // Filter by month
        if (filterMonth) {
            filtered = filtered.filter(exp => {
                const expDate = new Date(exp.date);
                const filterDate = new Date(filterMonth);
                return expDate.getMonth() === filterDate.getMonth() &&
                       expDate.getFullYear() === filterDate.getFullYear();
            });
        }

        return filtered;
    };

    const filteredExpenditures = getFilteredExpenditures();

    const totalAmount = filteredExpenditures.reduce((sum, exp) =>
        sum + parseFloat(exp.amount || 0), 0
    );

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
                <div className="modal-header">
                    <h2>Manage Expenditures</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {error && (
                    <div className="error-message" style={{ margin: '0 1.5rem' }}>
                        {error}
                    </div>
                )}

                {showAddForm && (
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                                {editingExpenditure ? 'Edit Expenditure' : 'Add New Expenditure'}
                            </h3>
                            <button
                                onClick={resetForm}
                                style={{
                                    padding: '0.25rem 0.75rem',
                                    backgroundColor: 'transparent',
                                    color: '#6b7280',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Cancel
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                        Expense Type *
                                    </label>
                                    <select
                                        name="expenseType"
                                        value={formData.expenseType}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem'
                                        }}
                                    >
                                        <option value="SALARY">Salary</option>
                                        <option value="INFRASTRUCTURE">Infrastructure</option>
                                        <option value="UTILITIES">Utilities</option>
                                        <option value="SUPPLIES">Supplies</option>
                                        <option value="MAINTENANCE">Maintenance</option>
                                        <option value="MISC">Miscellaneous</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                        Amount (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        name="amount"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        placeholder="Enter amount"
                                        min="0"
                                        step="0.01"
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem'
                                        }}
                                    />
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                        Comment
                                    </label>
                                    <textarea
                                        name="comment"
                                        value={formData.comment}
                                        onChange={handleChange}
                                        placeholder="Add any additional details..."
                                        rows="2"
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '0.375rem',
                                            fontSize: '0.875rem',
                                            resize: 'vertical'
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.5rem 1.5rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                {editingExpenditure ? 'Update Expenditure' : 'Add Expenditure'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Expenditure List Section */}
                <div style={{ borderBottom: '1px solid #e5e7eb', padding: '1rem 1.5rem', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            Expenditure List
                        </h3>
                        {!showAddForm && (
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowAddForm(true);
                                }}
                                style={{
                                    padding: '0.5rem 1rem',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '0.375rem',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}
                            >
                                + Add Expenditure
                            </button>
                        )}
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                Filter by Type
                            </label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem'
                                }}
                            >
                                <option value="ALL">All Types</option>
                                <option value="SALARY">Salary</option>
                                <option value="INFRASTRUCTURE">Infrastructure</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="SUPPLIES">Supplies</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="MISC">Miscellaneous</option>
                            </select>
                        </div>

                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                                Filter by Month
                            </label>
                            <input
                                type="month"
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '0.375rem',
                                    fontSize: '0.875rem'
                                }}
                            />
                        </div>

                        <button
                            onClick={() => {
                                setFilterType('ALL');
                                setFilterMonth('');
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500'
                            }}
                        >
                            Clear Filters
                        </button>
                    </div>

                    {/* Summary */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.375rem',
                        border: '1px solid #e5e7eb'
                    }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            Showing {filteredExpenditures.length} of {expenditures.length} expenditures
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                            Total: ₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.5rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                            Loading expenditures...
                        </div>
                    ) : filteredExpenditures.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                            {expenditures.length === 0 ? 'No expenditures found. Click "Add Expenditure" to create one.' : 'No expenditures match the current filters.'}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {filteredExpenditures.map((expenditure) => (
                                <div
                                    key={expenditure.expenditureId}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1rem',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '0.5rem',
                                        transition: 'all 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                                        e.currentTarget.style.borderColor = '#d1d5db';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.borderColor = '#e5e7eb';
                                    }}
                                >
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div
                                            style={{
                                                width: '4px',
                                                height: '48px',
                                                backgroundColor: getExpenseTypeColor(expenditure.expenseType),
                                                borderRadius: '2px'
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <span
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        color: getExpenseTypeColor(expenditure.expenseType),
                                                        backgroundColor: `${getExpenseTypeColor(expenditure.expenseType)}15`,
                                                        padding: '0.125rem 0.5rem',
                                                        borderRadius: '0.25rem'
                                                    }}
                                                >
                                                    {getExpenseTypeLabel(expenditure.expenseType)}
                                                </span>
                                                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                                    {formatDate(expenditure.date)}
                                                </span>
                                            </div>
                                            {expenditure.comment && (
                                                <div style={{ fontSize: '0.875rem', color: '#374151', marginTop: '0.25rem' }}>
                                                    {expenditure.comment}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>
                                                ₹{parseFloat(expenditure.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEdit(expenditure);
                                                }}
                                                style={{
                                                    padding: '0.375rem 0.75rem',
                                                    backgroundColor: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '0.375rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(expenditure.expenditureId);
                                                }}
                                                style={{
                                                    padding: '0.375rem 0.75rem',
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '0.375rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.875rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ManageExpendituresModal;
